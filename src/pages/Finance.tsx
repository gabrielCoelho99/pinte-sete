import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  created_at: string;
};

type MonthlyStats = {
  sales: number;
  income: number;
  expenses: number;
  profit: number;
  remaining: number;
};

export function Finance() {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Dashboard Stats
  const [stats, setStats] = useState<MonthlyStats>({
    sales: 0,
    income: 0,
    expenses: 0,
    profit: 0,
    remaining: 0
  });

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyTransactions();
    } else {
      fetchMonthlyStats();
    }
  }, [activeTab, selectedMonth]);

  const fetchDailyTransactions = async () => {
    try {
      // Fetch pure financial transactions (Expenses/Misc Income)
      const { data: trxData, error: trxError } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (trxError) throw trxError;
      
      // Fetch order payments for "Income" view if we want to combine them?
      // For now, let's keep "Caixa" as just the ledger of extra movements + manual entries,
      // OR specifically what the spreadsheet calls "Caixa (SAIDAS)".
      // The spreadsheet treats "Caixa" mostly as expenses but has "Type" which implies mixed.
      // Let's load everything from financial_transactions for now.
      
      setTransactions(trxData as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Erro ao carregar movimentações');

  };

  const fetchMonthlyStats = async () => {
    const start = startOfMonth(selectedMonth).toISOString();
    const end = endOfMonth(selectedMonth).toISOString();

    try {
      // 1. Sales (Total Order Value created in month)
      const { data: salesData } = await supabase
        .from('orders')
        .select('total_value')
        .gte('created_at', start)
        .lte('created_at', end);
      
      const totalSales = salesData?.reduce((acc, curr) => acc + Number(curr.total_value), 0) || 0;

      // 2. Income (Payments received in month: Down Payments + Ledger Payments)
      // Note: This is complex because down_payment is on order creation, ledger is separate.
      // Simplification: Sum down_payments of orders created this month (approx) + Ledger payments dated this month.
      
      const { data: ordersWithDown } = await supabase
        .from('orders')
        .select('down_payment')
        .gte('created_at', start)
        .lte('created_at', end);
        
      const totalDown = ordersWithDown?.reduce((acc, curr) => acc + Number(curr.down_payment), 0) || 0;

      const { data: ledgerPayments } = await supabase
        .from('financial_ledger')
        .select('amount')
        .eq('type', 'payment')
        .gte('created_at', start)
        .lte('created_at', end);

      const totalLedger = ledgerPayments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      
      // Also include "Income" from financial_transactions (e.g. unexpected extra income)
      const { data: extraIncome } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('created_at', start)
        .lte('created_at', end);
      
      const totalExtra = extraIncome?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      const totalIncome = totalDown + totalLedger + totalExtra;

      // 3. Expenses (From financial_transactions type='expense')
      const { data: expensesData } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('created_at', start)
        .lte('created_at', end);
      
      const totalExpenses = expensesData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setStats({
        sales: totalSales,
        income: totalIncome,
        expenses: totalExpenses,
        profit: totalIncome - totalExpenses, // Margem de Lucro: Entradas - Saidas
        remaining: totalSales - totalIncome // Falta Receber (Approx)
      });

    } catch (error) {
      console.error('Error calculating stats:', error);
      toast.error('Erro ao calcular resumo');
    }
  };





  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Caixa (Lançamentos)
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Resumo Mensal
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="font-semibold text-gray-700">Movimentações do Período</h2>
            <button className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
              <Plus size={16} />
              Lançar Movimentação
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{format(new Date(t.created_at), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.description}</td>
                    <td className="px-4 py-3 text-gray-500">{t.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      t.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      R$ {t.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <Calendar className="text-gray-400" />
            <span className="font-bold text-gray-700">Mês de Referência:</span>
            <input 
              type="month" 
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-sm font-medium">Vendas (Pedidos)</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">R$ {stats.sales.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-sm font-medium">Entradas (Recebido)</p>
              <p className="text-2xl font-bold text-green-600 mt-2 flex items-center gap-2">
                <ArrowUpCircle size={24} />
                R$ {stats.income.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-sm font-medium">Saídas (Despesas)</p>
              <p className="text-2xl font-bold text-red-600 mt-2 flex items-center gap-2">
                <ArrowDownCircle size={24} />
                R$ {stats.expenses.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
              <div className={`absolute right-0 top-0 p-4 opacity-10 ${stats.profit >= 0 ? 'bg-green-500' : 'bg-red-500'} h-full w-24 transform skew-x-12`} />
              <p className="text-gray-500 text-sm font-medium">Margem de Lucro</p>
              <p className={`text-2xl font-bold mt-2 ${stats.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                R$ {stats.profit.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Entradas - Saídas</p>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between items-center">
             <div>
               <h3 className="text-orange-800 font-bold">Falta Receber</h3>
               <p className="text-orange-600 text-sm">Valor pendente de pedidos deste mês</p>
             </div>
             <p className="text-xl font-bold text-orange-700">R$ {stats.remaining.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
