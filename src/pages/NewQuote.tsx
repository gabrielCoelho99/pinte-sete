import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '../types/supabase';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

type Customer = Database['public']['Tables']['customers']['Row'];

const quoteSchema = z.object({
  customer_id: z.string().min(1, 'Selecione um cliente'),
  valid_until: z.string().optional(),
  description: z.string().optional(),
  payment_method: z.string().optional(),
  items: z.array(z.object({
    product_name: z.string().min(1, 'Nome do item é obrigatório'),
    quantity: z.coerce.number().min(1, 'Qtd mínima é 1'),
    unit_price: z.coerce.number().min(0.01, 'Valor inválido'),
    description: z.string().optional()
  })).min(1, 'Adicione pelo menos um item'),
});

type QuoteForm = z.infer<typeof quoteSchema>;

export function NewQuote() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema) as any,
    defaultValues: {
      items: [{ product_name: '', quantity: 1, unit_price: 0, description: '' }],
      description: '',
      payment_method: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const items = watch('items');
  const totalValue = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unit_price || 0)), 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('name');
        if (error) throw error;
        setCustomers(data);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar clientes: ' + error.message);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          customer_id: data.customer_id,
          valid_until: data.valid_until || null,
          description: data.description,
          total_value: totalValue,
          status: 'draft',
          payment_method: data.payment_method
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteItems = data.items.map((item: any) => ({
        quote_id: quote.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        description: item.description || null
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems);
      if (itemsError) throw itemsError;

      toast.success('Orçamento criado com sucesso!');
      navigate(`/quotes/${quote.id}`);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('Erro ao criar orçamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <button onClick={() => navigate('/quotes')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Novo Orçamento</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
           <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[800px] flex flex-col print:shadow-none print:border-none print:rounded-none">
            
            <div className="bg-gray-900 p-8 text-center relative print:bg-white print:border-b-2 print:border-black">
                <h1 className="text-3xl font-black text-white tracking-wider print:text-black">PINTE7 - NOVO ORÇAMENTO</h1>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200 bg-gray-50/50">
                 <div className="p-6 border-b md:border-b-0 md:border-r border-gray-200">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Validade da Proposta</label>
                    <input 
                        type="date" 
                        {...register('valid_until')} 
                        className="w-full bg-white font-medium outline-none rounded-lg border border-gray-200 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" 
                    />
                 </div>
                 <div className="p-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Cond. Pagamento (Opcional)</label>
                    <input 
                        type="text" 
                        {...register('payment_method')} 
                        className="w-full bg-white font-medium outline-none rounded-lg border border-gray-200 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" 
                        placeholder="Ex: A vista no PIX" 
                    />
                 </div>
            </div>

            <div className="p-6 border-b border-gray-200 bg-white">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Cliente <span className="text-red-500">*</span></label>
                 <select 
                    {...register('customer_id')} 
                    className={`w-full p-3 text-lg font-bold border rounded-lg outline-none transition-all bg-white ${errors.customer_id ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'}`}
                 >
                    <option value="">Selecione o Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
                 {errors.customer_id && (
                    <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.customer_id.message}</span>
                    </div>
                 )}
                 
                 <div className="mt-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Título / Descrição Geral</label>
                    <input 
                        {...register('description')} 
                        className="w-full bg-white font-medium outline-none rounded-lg border border-gray-200 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" 
                        placeholder="Ex: Orçamento Uniformes Escolares 2025" 
                    />
                 </div>
            </div>

            <div className="flex-1">
                <div className="grid grid-cols-12 bg-gray-50 border-y border-gray-200 font-bold text-xs uppercase text-gray-500 tracking-wider">
                    <div className="col-span-1 p-3 text-center border-r border-gray-200">Qtd</div>
                    <div className="col-span-11 md:col-span-7 p-3 border-r border-gray-200">Descrição / Item</div>
                    <div className="hidden md:block col-span-2 p-3 text-right border-r border-gray-200">Preço Unit.</div>
                    <div className="hidden md:block col-span-2 p-3 text-right">Total</div>
                </div>

                {fields.map((field, index) => (
                     <div key={field.id} className="grid grid-cols-12 border-b border-gray-100 hover:bg-indigo-50/30 transition-colors group relative">
                        <div className="col-span-2 md:col-span-1 p-3 border-r border-gray-100 flex items-center justify-center">
                            <input 
                                type="number" 
                                min="1" 
                                {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
                                className="w-full text-center font-bold bg-transparent outline-none p-1 rounded hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                        <div className="col-span-10 md:col-span-7 p-3 border-r border-gray-100">
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    {...register(`items.${index}.product_name`)}
                                    placeholder="Nome do Item / Produto..."
                                    className={`text-sm font-bold bg-transparent outline-none w-full p-1 rounded hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all ${errors.items?.[index]?.product_name ? 'text-red-600 placeholder-red-300' : 'text-gray-800'}`}
                                />
                                <textarea 
                                    {...register(`items.${index}.description`)}
                                    className="w-full bg-transparent text-sm text-gray-500 outline-none resize-none overflow-hidden p-1 rounded hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all" 
                                    placeholder="Descrição detalhada (Opcional)..."
                                    rows={1}
                                />
                            </div>
                        </div>
                        
                        <div className="col-span-6 md:col-span-2 p-3 border-r border-gray-100 flex items-center justify-end">
                             <div className="flex items-center">
                                <span className="text-gray-400 text-sm mr-1">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    {...register(`items.${index}.unit_price`, { valueAsNumber: true })} 
                                    className="w-24 text-right font-medium bg-transparent outline-none p-1 rounded hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                             </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 p-3 flex items-center justify-between pl-4 relative">
                            <span className="font-bold text-gray-900">
                                R$ {((items[index]?.quantity || 0) * (items[index]?.unit_price || 0)).toFixed(2)}
                            </span>
                             <button 
                                type="button" 
                                onClick={() => remove(index)} 
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all absolute right-2"
                                title="Remover item"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Validation Error Message for Item */}
                        {errors.items?.[index]?.product_name && (
                             <div className="col-span-12 px-3 pb-2 text-xs text-red-500 md:pl-20">
                                * {errors.items[index]?.product_name?.message}
                             </div>
                        )}
                     </div>
                ))}
                
                 <div className="p-6 flex justify-center border-b border-gray-100 bg-gray-50/30">
                    <button type="button" onClick={() => append({ product_name: '', quantity: 1, unit_price: 0, description: '' })} className="group flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-all">
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform"/> 
                        ADICIONAR ITEM
                    </button>
                 </div>
            </div>

            <div className="bg-white border-t border-gray-100 p-8">
                 <div className="flex justify-between items-center bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <span className="font-bold uppercase text-gray-500 text-sm tracking-widest">Valor Total do Orçamento</span>
                    <span className="text-3xl font-black text-gray-900">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

           </div>

           <div className="flex justify-end gap-3 print:hidden pb-10">
            <button type="button" onClick={() => navigate('/quotes')} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors">Cancelar</button>
            <button 
                type="submit" 
                disabled={loading} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
            >
                {loading ? 'Salvando...' : (
                    <>
                        <Save className="w-5 h-5" /> CRIAR ORÇAMENTO
                    </>
                )}
            </button>
           </div>
      </form>
    </div>
  );
}
