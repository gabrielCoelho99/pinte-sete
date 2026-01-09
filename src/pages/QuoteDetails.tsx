import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle, Printer, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '../types/supabase';
import { format } from 'date-fns';

type Quote = Database['public']['Tables']['quotes']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row'] | null;
  quote_items: Database['public']['Tables']['quote_items']['Row'][];
};

export function QuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) fetchQuote(id);
  }, [id]);

  const fetchQuote = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customers (*),
          quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      setQuote(data as Quote);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Erro ao carregar orçamento');
      navigate('/quotes');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: Database['public']['Enums']['quote_status']) => {
    if (!quote) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quote.id);

      if (error) throw error;
      toast.success(`Status atualizado para ${status}`);
      if (quote) fetchQuote(quote.id);
    } catch (error: any) {
      toast.error('Erro ao atualizar status: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const convertToOrder = async () => {
    if (!quote) return;
    if (!confirm('Tem certeza que deseja converter este orçamento em um Pedido de Produção?')) return;

    setProcessing(true);
    try {
      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: quote.customer_id!, 
          total_value: quote.total_value,
          status: 'pending',
          notes: `Convertido do Orçamento #${quote.id.slice(0, 8)}... ` + (quote.description || ''),
          payment_method: quote.payment_method, // Carry over payment method
          down_payment: quote.down_payment // Carry over down payment
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = quote.quote_items.map(item => ({
        order_id: order.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        description: item.description // Carry over description
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Update Quote Status
      await supabase
        .from('quotes')
        .update({ status: 'converted' })
        .eq('id', quote.id);

      toast.success(`Orçamento convertido no Pedido #${order.display_id}`);
      navigate(`/orders/${order.id}`); // Go to new order
    } catch (error: any) {
      console.error('Conversion error:', error);
      toast.error('Erro ao converter: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;
  if (!quote) return <div className="p-8 text-center text-gray-500">Orçamento não encontrado.</div>;

  return (
    <div className="max-w-5xl mx-auto pb-10">
       <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/quotes')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
           <div className="flex gap-3 items-center">
             <h2 className="text-2xl font-bold text-gray-800">Orçamento</h2>
             <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize`}>
                {getStatusLabel(quote.status)}
            </span>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => window.print()}
             className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
             title="Imprimir"
          >
            <Printer className="w-5 h-5" /> Imprimir
          </button>
        </div>
      </div>

       {/* Print Container - Modernized */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[800px] flex flex-col print:shadow-none print:border-none print:rounded-none">
          <div className="bg-gray-900 p-8 text-center relative print:bg-white print:border-b-2 print:border-black">
                <h1 className="text-3xl font-black text-white tracking-wider print:text-black">PINTE7 - ORÇAMENTO</h1>
          </div>

          <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200 print:bg-white print:border-b-2 print:border-black">
                 <div className="p-4 px-6 border-r border-gray-200 flex justify-between items-center print:border-gray-400">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wide print:text-black">DATA:</span>
                    <span className="font-bold text-gray-900 print:text-black">{quote.created_at ? format(new Date(quote.created_at), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</span>
                 </div>
                 <div className="p-4 px-6 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wide print:text-black">VALIDADE:</span>
                    <span className="font-bold text-gray-900 print:text-black">{quote.valid_until ? format(new Date(quote.valid_until), 'dd/MM/yyyy') : '15 dias'}</span>
                 </div>
          </div>
          <div className="border-b border-gray-200 bg-gray-50 p-4 px-6 flex items-center gap-4 print:bg-white print:border-b-2 print:border-black">
                 <span className="text-xs font-bold uppercase text-gray-500 tracking-wide print:text-black">COND. PAGAMENTO:</span>
                 <span className="font-bold uppercase text-gray-900 print:text-black">{quote.payment_method || 'A Combinar'}</span>
          </div>

          <div className="border-b border-gray-200 bg-white print:border-b-2 print:border-black">
                <div className="bg-gray-50 p-3 text-center border-b border-gray-200 font-bold text-xs uppercase text-gray-500 tracking-wide print:bg-gray-200 print:text-black">Dados do Cliente</div>
                <div className="grid grid-cols-2">
                    <div className="p-4 px-6 border-r border-gray-200 flex items-center gap-2 print:border-gray-400">
                        <span className="font-bold text-xs text-gray-500 print:text-black">NOME:</span>
                        <span className="uppercase text-gray-900 font-medium">{quote.customers?.name}</span>
                    </div>
                     <div className="p-4 px-6 flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-500 print:text-black">TELEFONE:</span>
                        <span className="uppercase text-gray-900 font-medium">{quote.customers?.phone}</span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 border-b border-gray-200 font-semibold text-xs text-gray-500 uppercase tracking-wider grid grid-cols-12 text-center print:bg-gray-200 print:text-black print:border-black print:text-sm print:font-bold">
                <div className="col-span-1 p-3 border-r border-gray-200 print:border-black">Qtd</div>
                <div className="col-span-7 p-3 border-r border-gray-200 print:border-black">Descrição</div>
                <div className="col-span-2 p-3 border-r border-gray-200 print:border-black">Preço Unit.</div>
                <div className="col-span-2 p-3">Total</div>
            </div>

             <div className="flex-1">
                {quote.quote_items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 text-sm border-b border-gray-100 hover:bg-indigo-50/50 transition-colors print:border-gray-300">
                        <div className="col-span-1 p-3 border-r border-gray-100 flex items-center justify-center font-bold text-gray-700 print:border-gray-400">
                            {item.quantity}
                        </div>
                        <div className="col-span-7 p-3 border-r border-gray-100 print:border-gray-400">
                            <div className="font-bold uppercase mb-1 text-gray-900">{item.product_name}</div>
                            {item.description && (
                                <div className="text-gray-500 whitespace-pre-wrap uppercase print:text-black font-medium text-xs">{item.description}</div>
                            )}
                        </div>
                        <div className="col-span-2 p-3 border-r border-gray-100 flex items-center justify-end text-gray-700 print:border-gray-400">
                            R$ {item.unit_price.toFixed(2)}
                        </div>
                        <div className="col-span-2 p-3 flex items-center justify-end font-bold text-gray-900">
                             R$ {(item.quantity * item.unit_price).toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>

             <div className="bg-white border-t border-gray-100 print:border-t-2 print:border-black">
                 <div className="flex justify-between items-center p-6 bg-gray-50 print:bg-gray-100 print:text-black border-b border-gray-100">
                    <span className="font-black uppercase text-xl text-indigo-900 print:text-black">Valor Total</span>
                    <span className="font-black text-3xl text-indigo-900 print:text-black">R$ {quote.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
      </div>

       {/* Actions */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6 print:hidden">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Ações</h3>
             <div className="flex flex-wrap gap-4">
            {quote.status === 'draft' || quote.status === 'sent' ? (
              <>
                <button
                  onClick={() => updateStatus('approved')}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> Aprovar Orçamento
                </button>
                <button
                  onClick={() => updateStatus('rejected')}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Rejeitar
                </button>
              </>
            ) : null}

            {quote.status === 'approved' && (
              <button
                onClick={convertToOrder}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" /> Converter em Pedido
              </button>
            )}

            {quote.status === 'converted' && (
              <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm text-center font-medium border border-purple-200">
                ✅ Convertido em Pedido
              </div>
            )}
            </div>
       </div>

    </div>
  );
}

function getStatusLabel(status: string) {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      case 'converted': return 'Convertido';
      case 'sent': return 'Enviado';
      default: return 'Rascunho';
    }
  }
