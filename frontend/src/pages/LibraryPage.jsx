import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { libraryApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  Download,
  Play,
  FolderOpen,
  Upload
} from 'lucide-react';

const CATEGORIES = [
  'Regras',
  'Táticas',
  'Treino',
  'Técnica Individual',
  'Guarda-Redes',
  'Preparação Física',
  'Nutrição',
  'Psicologia',
  'Árbitros',
  'História',
  'Outros'
];

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LibraryPage() {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    item_type: 'link',
    url: '',
    category: '',
    tags: []
  });

  const canManageLibrary = user?.role === 'admin' || user?.role === 'treinador';

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await libraryApi.getAll();
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching library:', error);
      toast.error('Erro ao carregar biblioteca');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await libraryApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      item_type: 'link',
      url: '',
      category: '',
      tags: []
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Apenas ficheiros PDF são permitidos');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ficheiro muito grande (máximo 10MB)');
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch(`${API_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        url: data.url,
        title: prev.title || file.name.replace('.pdf', ''),
        item_type: 'pdf'
      }));
      toast.success('Ficheiro carregado!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.url) {
      toast.error('Preencha o título e URL/ficheiro');
      return;
    }

    setSaving(true);
    try {
      await libraryApi.create(formData);
      toast.success('Item adicionado à biblioteca!');
      setShowCreateDialog(false);
      resetForm();
      fetchItems();
      fetchCategories();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao criar item';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.title || !formData.url) {
      toast.error('Preencha o título e URL/ficheiro');
      return;
    }

    setSaving(true);
    try {
      await libraryApi.update(selectedItem.id, formData);
      toast.success('Item atualizado!');
      setShowEditDialog(false);
      setSelectedItem(null);
      resetForm();
      fetchItems();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao atualizar item';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await libraryApi.delete(selectedItem.id);
      toast.success('Item eliminado!');
      setShowDeleteDialog(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      toast.error('Erro ao eliminar item');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (item) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      item_type: item.item_type,
      url: item.url,
      category: item.category || '',
      tags: item.tags || []
    });
    setShowEditDialog(true);
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.item_type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'pdf': return 'bg-red-500/10 text-red-600';
      case 'video': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-blue-500/10 text-blue-600';
    }
  };

  const renderItemCard = (item) => (
    <Card key={item.id} className="border border-border hover:border-primary/50 transition-colors group">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Thumbnail or Icon */}
          {item.thumbnail_url ? (
            <div className="w-16 h-12 sm:w-24 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
              <img 
                src={item.thumbnail_url} 
                alt="" 
                className="w-full h-full object-cover"
              />
              {item.item_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(item.item_type)}`}>
              {getTypeIcon(item.item_type)}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm sm:text-base truncate" title={item.title}>
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 break-words">
                    {item.description}
                  </p>
                )}
              </div>
              {canManageLibrary && (
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-destructive"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2 sm:mt-3">
              {item.category && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  {item.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {item.item_type === 'pdf' ? 'PDF' : item.item_type === 'video' ? 'Vídeo' : 'Link'}
              </Badge>
              
              <div className="flex-1" />
              
              <Button
                variant="outline"
                size="sm"
                className="h-6 sm:h-7 text-xs px-2"
                onClick={() => window.open(item.url, '_blank')}
              >
                {item.item_type === 'pdf' ? (
                  <>
                    <Download className="w-3 h-3 mr-1" />
                    <span className="hidden xs:inline">Abrir</span>
                  </>
                ) : item.item_type === 'video' ? (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    <span className="hidden xs:inline">Ver</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    <span className="hidden xs:inline">Visitar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="library-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
            BIBLIOTECA
          </h1>
          <p className="text-muted-foreground mt-1">
            Documentação e recursos sobre hóquei em patins
          </p>
        </div>
        
        {canManageLibrary && (
          <Button 
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            data-testid="add-library-item-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="video">Vídeos</SelectItem>
            <SelectItem value="link">Links</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map(renderItemCard)}
        </div>
      ) : (
        <Card className="border border-dashed border-border">
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">Biblioteca Vazia</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== 'all' || selectedType !== 'all'
                ? 'Nenhum item encontrado com os filtros aplicados.'
                : 'Ainda não existem documentos na biblioteca.'}
            </p>
            {canManageLibrary && !searchQuery && selectedCategory === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Item
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showCreateDialog || showEditDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setShowEditDialog(false);
            setSelectedItem(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Editar Item' : 'Adicionar à Biblioteca'}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog ? 'Altere as informações do item' : 'Adicione um documento, link ou vídeo'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Tipo de Conteúdo</Label>
              <Tabs 
                value={formData.item_type} 
                onValueChange={(v) => setFormData({ ...formData, item_type: v, url: '' })}
              >
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="link" className="flex items-center gap-1">
                    <LinkIcon className="w-4 h-4" />
                    Link
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    Vídeo
                  </TabsTrigger>
                  <TabsTrigger value="pdf" className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    PDF
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome do documento/recurso"
              />
            </div>

            {/* URL or File Upload */}
            <div className="space-y-2">
              <Label>{formData.item_type === 'pdf' ? 'Ficheiro PDF' : 'URL'} *</Label>
              {formData.item_type === 'pdf' ? (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {formData.url ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="w-5 h-5 text-red-500" />
                      <span className="text-sm truncate flex-1">
                        {formData.url.split('/').pop()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Alterar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          A carregar...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Carregar PDF
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder={formData.item_type === 'video' 
                    ? 'https://youtube.com/watch?v=...' 
                    : 'https://...'}
                />
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descrição do conteúdo"
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={showEditDialog ? handleEdit : handleCreate} 
              disabled={saving || uploading}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {showEditDialog ? 'A guardar...' : 'A adicionar...'}
                </>
              ) : (
                showEditDialog ? 'Guardar Alterações' : 'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar "{selectedItem?.title}"?
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A eliminar...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
