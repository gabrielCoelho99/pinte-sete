import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Client
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '../types/supabase';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

// Schemas
const orderSchema = z.object({
  customer_id: z.string().min(1, 'Selecione um cliente'),
  delivery_date: z.string().optional(),
  payment_method: z.string().optional(),
  down_payment: z.coerce.number().optional().default(0),
  is_internal_transfer: z.boolean().default(false),
  items: z.array(z.object({
    product_id: z.string().min(1, 'Selecione um produto'),
    quantity: z.coerce.number().min(1, 'Qtd mínima é 1'),
    unit_price: z.coerce.number().min(0.01, 'Valor inválido'),
    original_price: z.coerce.number().optional().default(0),
    description: z.string().optional()
  })).min(1, 'Adicione pelo menos um item'),
});

type OrderForm = z.infer<typeof orderSchema>;

export function NewOrder() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, setValue } = useForm<OrderForm>({
    resolver: zodResolver(orderSchema) as any,
    defaultValues: {
      items: [{ product_id: '', quantity: 1, unit_price: 0, original_price: 0, description: '' }],
      down_payment: 0,
      is_internal_transfer: false
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const items = watch('items');
  const downPayment = watch('down_payment') || 0;
  const isInternalTransfer = watch('is_internal_transfer');
  
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const remainingValue = totalValue - downPayment;

  useEffect(() => {
    const fetchData = async () => {
      const [custRes, prodRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('products').select('*').order('name')
      ]);
      if (custRes.data) setCustomers(custRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    };
    fetchData();
  }, []);

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.unit_price`, product.price);
      setValue(`items.${index}.original_price`, product.price);
      // PRE-FILL description with product name, but allow edit
      const currentDesc = items[index].description;
      if (!currentDesc) {
          setValue(`items.${index}.description`, product.name); 
      }
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: data.customer_id,
          delivery_date: data.delivery_date || null,
          total_value: totalValue,
          status: 'pending',
          payment_method: data.payment_method,
          down_payment: data.down_payment,
          is_internal_transfer: data.is_internal_transfer
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = data.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        description: item.description || null,
        original_price: item.original_price || null 
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Handle Internal Transfer (Ledger)
      if (data.is_internal_transfer) {
          const debtAmount = totalValue - (data.down_payment || 0);
          if (debtAmount > 0) {
             const { error: ledgerError } = await supabase.from('financial_ledger').insert({
                 entity_name: 'Crescer Uniformes',
                 type: 'debt_accrual',
                 amount: debtAmount,
                 order_id: order.id,
                 description: `Pedido #${order.display_id}`
             });
             if (ledgerError) console.error('Error creating ledger entry:', ledgerError);
             // We don't block the order creation success for this, but ideally we should transactionalize it.
          }
      }

      toast.success(`Pedido #${order.display_id} criado!`);
      navigate('/orders');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <button onClick={() => navigate('/orders')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Novo Pedido</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Paper-like Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[800px] flex flex-col print:shadow-none print:border-none print:rounded-none">
            
            {/* Header / Logo Area */}
            <div className="bg-gray-900 p-8 text-center relative print:bg-white print:border-b-2 print:border-black">
                <h1 className="text-3xl font-black text-white tracking-wider print:text-black">PINTE7 MALHARIA E UNIFORMES</h1>
                <div className="absolute top-4 right-4 print:hidden">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-800 px-3 py-1 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors">
                        <input type="checkbox" {...register('is_internal_transfer')} className="w-4 h-4 text-yellow-500 rounded bg-gray-700 border-gray-600 focus:ring-yellow-500" />
                        <span className="text-xs font-bold uppercase text-yellow-400">Repasse Interno</span>
                    </label>
                </div>
            </div>

            {/* Top Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 bg-gray-50 border-b border-gray-200 print:bg-white print:border-b-2 print:border-black">
                 <div className="p-6 border-b md:border-b-0 md:border-r border-gray-200 print:border-gray-300">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Data de Entrega</label>
                    <input type="date" {...register('delivery_date')} className="w-full bg-white font-medium outline-none rounded-lg border border-gray-200 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                 </div>
                 <div className="p-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Forma de Pagamento</label>
                    <select {...register('payment_method')} className="w-full bg-white font-medium outline-none rounded-lg border border-gray-200 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
                        <option value="">Selecione...</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="PIX">PIX</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Boleto">Boleto</option>
                    </select>
                 </div>
            </div>

            {/* Customer Info */}
             <div className="p-6 border-b border-gray-200 bg-white print:border-b-2 print:border-black">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Dados do Cliente</label>
                 <select {...register('customer_id')} className="w-full p-2 text-lg font-bold border-b-2 border-gray-100 outline-none focus:border-indigo-500 bg-transparent text-gray-800 transition-colors">
                    <option value="">Selecione o Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
                 <div className="mt-2 text-sm text-gray-400 font-medium">
                    {/* Show phone if selected */}
                     {customers.find(c => c.id === watch('customer_id'))?.phone || 'Telefone não disponível'}
                 </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
                <div className={`grid ${isInternalTransfer ? 'grid-cols-12' : 'grid-cols-12'} bg-gray-50 border-b border-gray-200 font-semibold text-xs text-gray-500 uppercase tracking-wider print:bg-gray-100 print:text-black print:border-black`}>
                    <div className="col-span-1 p-3 text-center border-r border-gray-200 print:border-gray-400">Qtd</div>
                    <div className="col-span-7 p-3 border-r border-gray-200 print:border-gray-400">Descrição</div>
                    <div className="col-span-2 p-3 text-right border-r border-gray-200 print:border-gray-400">Preço Unit.</div>
                    <div className="col-span-2 p-3 text-right">Total</div>
                </div>

                {fields.map((field, index) => (
                     <div key={field.id} className="grid grid-cols-12 border-b border-gray-100 hover:bg-indigo-50/50 transition-colors group print:border-gray-300">
                        <div className="col-span-1 p-2 border-r border-gray-100 flex items-center justify-center print:border-gray-300">
                            <input 
                                type="number" 
                                min="1" 
                                {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
                                className="w-full text-center font-bold bg-transparent outline-none p-1 text-gray-700"
                            />
                             {/* Hidden original price */}
                            <input type="hidden" {...register(`items.${index}.original_price`)} />
                        </div>
                        <div className="col-span-7 p-2 border-r border-gray-100 relative print:border-gray-300">
                             {/* Product Select AND Description Text Area */}
                            <div className="flex flex-col gap-1">
                                <select
                                    {...register(`items.${index}.product_id`)}
                                    onChange={(e) => {
                                        register(`items.${index}.product_id`).onChange(e);
                                        handleProductChange(index, e.target.value);
                                    }}
                                    className="text-xs text-gray-400 bg-transparent outline-none w-full mb-1 focus:text-indigo-600 font-medium transition-colors"
                                >
                                    <option value="">Produto (Base)...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <textarea 
                                    {...register(`items.${index}.description`)}
                                    className="w-full bg-transparent font-medium outline-none resize-none overflow-hidden text-gray-800 placeholder-gray-300" 
                                    placeholder="Descrição detalhada do item..."
                                    rows={2}
                                />
                                {isInternalTransfer && items[index]?.original_price && (
                                    <div className="text-xs text-indigo-400 mt-1 font-mono bg-indigo-50 inline-block px-1 rounded">
                                        Original: R$ {items[index].original_price?.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-span-2 p-2 border-r border-gray-100 flex items-center justify-end print:border-gray-300">
                             <div className="flex items-center">
                                <span className="text-gray-400 text-sm mr-1">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    {...register(`items.${index}.unit_price`, { valueAsNumber: true })} 
                                    className="w-20 text-right font-medium bg-transparent outline-none text-gray-700"
                                />
                             </div>
                        </div>
                        <div className="col-span-2 p-2 flex items-center justify-between pl-4 relative">
                            <span className="font-bold text-gray-900">
                                R$ {((items[index]?.quantity || 0) * (items[index]?.unit_price || 0)).toFixed(2)}
                            </span>
                             <button 
                                type="button" 
                                onClick={() => remove(index)} 
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all absolute right-2"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                     </div>
                ))}

                 <div className="p-4 flex justify-center border-b border-gray-200 print:border-gray-800">
                    <button type="button" onClick={() => append({ product_id: '', quantity: 1, unit_price: 0, original_price: 0 })} className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors print:hidden">
                        <Plus className="w-4 h-4"/> Adicionar Linha
                    </button>
                 </div>
            </div>

            {/* Footer / Totals */}
            <div className="bg-white border-t border-gray-200 print:border-t-2 print:border-black">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-8 border-r border-gray-200 print:border-gray-300">
                        {/* Notes or other footer info could go here */}
                    </div>
                    <div className="divide-y divide-gray-100">
                         <div className="flex justify-between items-center p-6">
                            <span className="font-bold uppercase text-gray-500 text-sm tracking-wide">Valor Total</span>
                            <span className="text-2xl font-bold text-gray-900">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                         <div className="flex justify-between items-center p-6 bg-red-50/50">
                            <span className="font-bold uppercase text-red-600 text-sm tracking-wide">Valor de Entrada</span>
                            <div className="flex items-center gap-2">
                                <span className="text-red-500 font-bold">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    {...register('down_payment', { valueAsNumber: true })} 
                                    className="w-32 text-right font-bold text-red-600 bg-transparent border-b-2 border-red-200 outline-none focus:border-red-500 text-lg transition-colors"
                                />
                            </div>
                        </div>
                         <div className="flex justify-between items-center p-6 bg-indigo-50 text-indigo-900">
                            <span className="font-black uppercase tracking-wide">Valor Restante</span>
                            <span className="font-black text-3xl">R$ {remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <div className="flex justify-end gap-3 print:hidden">
            <button type="button" onClick={() => navigate('/orders')} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-green-200 disabled:opacity-70 transition-all">
                <Save className="w-5 h-5" /> Salvar Pedido
            </button>
        </div>
      </form>
    </div>
  );
}
