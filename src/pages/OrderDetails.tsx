import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Printer, CheckCircle, Truck, XCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '../types/supabase';
import { format } from 'date-fns';

type Order = Database['public']['Tables']['orders']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row'] | null;
  order_items: Database['public']['Tables']['order_items']['Row'][];
  is_internal_transfer: boolean;
};

export function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [productionMode, setProductionMode] = useState(false);

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id]);

  const fetchOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data as Order);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Erro ao carregar pedido');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: Database['public']['Enums']['order_status']) => {
    if (!order) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', order.id);

      if (error) throw error;
      toast.success(`Status atualizado para ${status}`);
      if (order) fetchOrder(order.id);
    } catch (error: any) {
      toast.error('Erro ao atualizar status: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;
  if (!order) return <div className="p-8 text-center text-gray-500">Pedido não encontrado.</div>;

  const remainingValue = (order.total_value || 0) - (order.down_payment || 0);

  return (
    <div className="max-w-5xl mx-auto pb-10">
      
      {/* Action Header (Hidden on Print) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex gap-3 items-center">
            <h2 className="text-2xl font-bold text-gray-800">Pedido #{order.display_id}</h2>
             <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize`}>
                {getStatusLabel(order.status)}
            </span>
             {order.is_internal_transfer && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                    REPASSE INTERNO
                </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setProductionMode(!productionMode)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border ${productionMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
          >
             {productionMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
             {productionMode ? 'Modo Produção (Ativo)' : 'Modo Produção'}
          </button>
          <button 
             onClick={() => window.print()}
             className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

     {/* Visualization / Print Container */}
     <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[800px] flex flex-col print:shadow-none print:border-none print:rounded-none">
            
            {/* Header / Logo Area */}
            <div className="bg-gray-900 p-8 text-center relative print:bg-white print:border-b-2 print:border-black">
                <h1 className="text-3xl font-black text-white tracking-wider print:text-black">PINTE7 MALHARIA E UNIFORMES</h1>
                {(order.is_internal_transfer || productionMode) && (
                    <div className="absolute top-4 right-4 border-2 border-dashed border-gray-700 p-2 px-4 rounded-lg font-bold text-gray-400 uppercase text-xs tracking-widest print:border-gray-300">
                        {productionMode ? 'FICHA DE PRODUÇÃO' : 'REPASSE INTERNO'}
                    </div>
                )}
            </div>

            {/* Top Stats Bar */}
            <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200 print:bg-white print:border-b-2 print:border-black">
                 <div className="p-4 px-6 border-r border-gray-200 flex justify-between items-center print:border-gray-400">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wide print:text-black">DATA DO PEDIDO:</span>
                    <span className="font-bold text-gray-900 print:text-black">{order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy') : '-'}</span>
                 </div>
                 <div className="p-4 px-6 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wide print:text-black">SÃO LUÍS - MARANHÃO</span>
                 </div>
            </div>
             <div className="border-b border-gray-200 bg-gray-50 p-4 px-6 flex items-center gap-4 print:bg-white print:border-b-2 print:border-black">
                 <span className="text-xs font-bold uppercase text-gray-500 tracking-wide print:text-black">FORMA DE PAGAMENTO:</span>
                 <span className="font-bold uppercase text-gray-900 print:text-black">{order.payment_method || '-'}</span>
             </div>

            {/* Customer Info */}
             <div className="border-b border-gray-200 bg-white print:border-b-2 print:border-black">
                <div className="bg-gray-50 p-3 text-center border-b border-gray-200 font-bold text-xs uppercase text-gray-500 tracking-wide print:bg-gray-200 print:text-black">Dados do Cliente</div>
                <div className="grid grid-cols-2">
                    <div className="p-4 px-6 border-r border-gray-200 flex items-center gap-2 print:border-gray-400">
                        <span className="font-bold text-xs text-gray-500 print:text-black">NOME:</span>
                        <span className="uppercase text-gray-900 font-medium">{order.customers?.name}</span>
                    </div>
                     <div className="p-4 px-6 flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-500 print:text-black">TELEFONE:</span>
                        <span className="uppercase text-gray-900 font-medium">{order.customers?.phone}</span>
                    </div>
                </div>
            </div>

            {/* Items Table Header */}
             <div className="bg-gray-50 border-b border-gray-200 font-semibold text-xs text-gray-500 uppercase tracking-wider grid grid-cols-12 text-center print:bg-gray-200 print:text-black print:border-black print:text-sm print:font-bold">
                <div className="col-span-1 p-3 border-r border-gray-200 print:border-black">Qtd</div>
                <div className={`${productionMode ? 'col-span-11' : 'col-span-7'} p-3 border-r border-gray-200 print:border-black`}>Descrição</div>
                {!productionMode && (
                    <>
                        <div className="col-span-2 p-3 border-r border-gray-200 print:border-black">Preço Unit.</div>
                        <div className="col-span-2 p-3">Total</div>
                    </>
                )}
            </div>

            {/* Items Table Body */}
            <div className="flex-1">
                {order.order_items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 text-sm border-b border-gray-100 hover:bg-indigo-50/50 transition-colors print:border-gray-300">
                        <div className="col-span-1 p-3 border-r border-gray-100 flex items-center justify-center font-bold text-gray-700 print:border-gray-400">
                            {item.quantity}
                        </div>
                        <div className={`${productionMode ? 'col-span-11' : 'col-span-7'} p-3 border-r border-gray-100 print:border-gray-400`}>
                            <div className="font-bold uppercase mb-1 text-gray-900">{item.product_name}</div>
                            {item.description && item.description !== item.product_name && (
                                <div className="text-gray-500 whitespace-pre-wrap uppercase print:text-black font-medium text-xs">{item.description}</div>
                            )}
                        </div>
                        {!productionMode && (
                            <>
                                <div className="col-span-2 p-3 border-r border-gray-100 flex items-center justify-end text-gray-700 print:border-gray-400">
                                    R$ {item.unit_price.toFixed(2)}
                                </div>
                                <div className="col-span-2 p-3 flex items-center justify-end font-bold text-gray-900">
                                    R$ {(item.quantity * item.unit_price).toFixed(2)}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer / Totals */}
            <div className="bg-white border-t border-gray-200 print:border-t-2 print:border-black">
                <div className="flex flex-col">
                        
                         {!productionMode && (
                             <>
                                <div className="flex justify-between items-center p-4 px-6 border-b border-gray-100 print:border-gray-400">
                                    <span className="font-bold uppercase text-gray-500 print:text-black text-xs tracking-wide">Valor Total da Nota</span>
                                    <span className="text-xl font-bold text-gray-900 print:text-black">R$ {order.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="flex justify-between items-center p-4 px-6 border-b border-gray-100 bg-red-50/50 print:bg-gray-100 print:border-gray-400 print:text-black">
                                    <span className="font-bold uppercase text-red-600 print:text-black text-xs tracking-wide">Valor de Entrada</span>
                                    <span className="text-xl font-bold text-red-600 print:text-black font-mono">
                                        R$ {order.down_payment?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center p-6 bg-indigo-50 text-indigo-900 print:bg-gray-300 print:text-black border-b-2 border-indigo-100 print:border-black">
                                    <span className="font-black uppercase text-xl">Valor Restante</span>
                                    <span className="font-black text-3xl">R$ {remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                             </>
                         )}

                        <div className="flex">
                             <div className="w-1/2 p-4 border-r border-gray-200 flex items-center justify-center gap-2 font-bold uppercase text-sm text-gray-500 print:border-black">
                                Data de Entrega
                            </div>
                            <div className="w-1/2 p-4 flex items-center justify-center font-bold text-2xl text-gray-900 print:text-black">
                                {order.delivery_date ? format(new Date(order.delivery_date!), 'dd/MM/yyyy') : '-'}
                            </div>
                        </div>
                </div>
            </div>

        </div>

        {/* Status Actions (Non-printable) */}
        <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:hidden">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Gerenciar Status</h3>
            <div className="flex flex-wrap gap-4">
                <button
                onClick={() => updateStatus('in_progress')}
                disabled={processing || order.status === 'in_progress'}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                <Clock className="w-4 h-4" /> Em Produção
                </button>
                <button
                onClick={() => updateStatus('delivered')}
                disabled={processing || order.status === 'delivered'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                <Truck className="w-4 h-4" /> Entregue
                </button>
                <button
                onClick={() => updateStatus('completed')}
                disabled={processing || order.status === 'completed'}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                <CheckCircle className="w-4 h-4" /> Finalizado
                </button>
                <button
                onClick={() => updateStatus('cancelled')}
                disabled={processing || order.status === 'cancelled'}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                <XCircle className="w-4 h-4" /> Cancelar
                </button>
            </div>
        </div>
    </div>
  );
}

function getStatusLabel(status: string) {
    switch (status) {
      case 'completed': return 'Pronto / Finalizado';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      case 'in_progress': return 'Em Produção';
      case 'pending': return 'Pendente';
      default: return status;
    }
}
