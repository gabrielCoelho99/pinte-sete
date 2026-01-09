import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Search, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Database } from '../types/supabase';

type Order = Database['public']['Tables']['orders']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row'] | null;
  financial_ledger: Database['public']['Tables']['financial_ledger']['Row'][];
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          financial_ledger (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      delivered: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };

    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Produção',
      completed: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // Calculate total paid (down_payment + ledger payments)
  const calculatePaid = (order: Order) => {
    const ledgerPayments = order.financial_ledger
      ?.filter(l => l.type === 'payment')
      .reduce((sum, l) => sum + Number(l.amount), 0) || 0;
    
    return (order.down_payment || 0) + ledgerPayments;
  };

  const filteredOrders = orders.filter(order => 
    order.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.display_id.toString().includes(searchTerm)
  );

  if (loading) return <div className="text-center p-8 text-gray-500">Carregando acompanhamento...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Acompanhamento de Pedidos</h1>
          <p className="text-gray-500">Visão geral estilo planilha</p>
        </div>
        <div className="flex gap-2">
           <Link to="/orders/new" className="bg-indigo-600 px-4 py-2 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
             + Novo Pedido
           </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por cliente ou OP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
              <tr>
                <th className="px-4 py-3 border-r border-gray-200 w-16">OP</th>
                <th className="px-4 py-3 border-r border-gray-200">Cliente</th>
                <th className="px-4 py-3 border-r border-gray-200 text-right">Valor Pedido</th>
                <th className="px-4 py-3 border-r border-gray-200 text-center">Data Pedido</th>
                <th className="px-4 py-3 border-r border-gray-200 text-right">Valor Pago</th>
                <th className="px-4 py-3 border-r border-gray-200 text-right">A Receber</th>
                <th className="px-4 py-3 border-r border-gray-200 text-center">Entrega</th>
                <th className="px-4 py-3 border-r border-gray-200 text-center">Situação</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const totalPaid = calculatePaid(order);
                const remaining = order.total_value - totalPaid;
                const isFullyPaid = remaining <= 0.01; // Tolerance for float
                const isDelivered = order.status === 'delivered' || order.status === 'completed';
                
                // Color row GREEN if OK (Paid & Delivered/Completed) or just visually emphasizing successful states
                const rowClass = (isFullyPaid && isDelivered) ? 'bg-green-50' : 'hover:bg-gray-50';

                return (
                  <tr key={order.id} className={`${rowClass} transition-colors group`}>
                    <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-100">
                      #{order.display_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray-100">
                      {order.customers?.name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 border-r border-gray-100">
                      R$ {order.total_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">
                      {order.created_at && format(new Date(order.created_at), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium border-r border-gray-100">
                      R$ {totalPaid.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold border-r border-gray-100 ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      R$ {remaining > 0 ? remaining.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">
                      {order.delivery_date ? format(new Date(order.delivery_date), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-100">
                      {getSatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          to={`/orders/${order.id}`} // Clicking print goes to details which has print view
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver Detalhes / Imprimir"
                        >
                          <Printer className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nenhum pedido encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
