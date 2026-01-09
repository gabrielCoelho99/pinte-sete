import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Tag, Package } from 'lucide-react';
import type { Database } from '../types/supabase';
import { Modal } from '../components/Modal';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type Product = Database['public']['Tables']['products']['Row'];

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ name: string; price: number }>();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: { name: string; price: number }) => {
    try {
      const { error } = await supabase
        .from('products')
        .insert(data);
        
      if (error) throw error;
      
      toast.success('Produto cadastrado com sucesso!');
      setIsModalOpen(false);
      reset();
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro ao cadastrar: ' + error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Produtos</h2>
          <p className="text-gray-500">Gerencie seu catálogo de serviços/produtos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
            <div className="bg-gray-50 p-3 rounded-full">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <div key={product.id} className="p-4 hover:bg-gray-50 hover:bg-opacity-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Produto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
            <input
              {...register('name', { required: true })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Ex: Polo Bordada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço Sugerido (R$)</label>
            <input
              type="number"
              step="0.01"
              {...register('price', { required: true, valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-70"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
