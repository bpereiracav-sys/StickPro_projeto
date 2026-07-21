import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  File,
  FileImage,
  FileText,
  Film,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { championshipsApi } from '../../services/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const CATEGORY_OPTIONS = [
  {
    value: 'gamesheet',
    label: 'Boletim oficial',
  },
  {
    value: 'technical_report',
    label: 'Relatório técnico',
  },
  {
    value: 'tactical',
    label: 'Documento tático',
  },
  {
    value: 'medical',
    label: 'Documento médico',
  },
  {
    value: 'photo',
    label: 'Fotografia',
  },
  {
    value: 'video',
    label: 'Vídeo',
  },
  {
    value: 'other',
    label: 'Outro',
  },
];

const VISIBILITY_OPTIONS = [
  {
    value: 'technical_staff',
    label: 'Equipa técnica',
  },
  {
    value: 'coach_only',
    label: 'Apenas treinador',
  },
  {
    value: 'team',
    label: 'Equipa',
  },
  {
    value: 'player',
    label: 'Atletas',
  },
  {
    value: 'all',
    label: 'Todos',
  },
];

const INITIAL_FORM = {
  title: '',
  description: '',
  category: 'other',
  visibility: 'technical_staff',
};

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;

  if (size === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1
  );

  const value = size / 1024 ** unitIndex;

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDocumentDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getCategoryLabel(value) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label ||
    'Outro'
  );
}

function getVisibilityLabel(value) {
  return (
    VISIBILITY_OPTIONS.find((option) => option.value === value)?.label ||
    value ||
    'Equipa técnica'
  );
}

function resolveDocumentUrl(url) {
  if (!url) {
    return '';
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${BACKEND_URL}${url}`;
  }

  return `${BACKEND_URL}/${url}`;
}

function getDocumentIcon(document) {
  const mimeType = document?.mime_type || '';
  const fileCategory = document?.file_category || '';

  if (
    mimeType.startsWith('image/') ||
    fileCategory === 'image'
  ) {
    return FileImage;
  }

  if (
    mimeType.startsWith('video/') ||
    fileCategory === 'video'
  ) {
    return Film;
  }

  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    fileCategory === 'document'
  ) {
    return FileText;
  }

  return File;
}

export default function MatchDocuments({
  matchId,
  canManage = false,
}) {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadDocuments = useCallback(async () => {
    if (!matchId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response =
        await championshipsApi.getMatchDocuments(matchId);

      setDocuments(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      console.error('Error loading match documents:', error);

      toast.error(
        error.response?.data?.detail ||
          'Erro ao carregar os documentos do jogo'
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const resetUploadForm = () => {
    setForm(INITIAL_FORM);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeUploadForm = () => {
    resetUploadForm();
    setShowUploadForm(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSelectedFile(file);

    if (file && !form.title.trim()) {
      const titleWithoutExtension = file.name.replace(
        /\.[^/.]+$/,
        ''
      );

      setForm((current) => ({
        ...current,
        title: titleWithoutExtension,
      }));
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error('Indique o título do documento');
      return;
    }

    if (!selectedFile) {
      toast.error('Selecione um ficheiro');
      return;
    }

    const formData = new FormData();

    formData.append('title', form.title.trim());
    formData.append('category', form.category);
    formData.append('visibility', form.visibility);
    formData.append(
      'description',
      form.description.trim()
    );
    formData.append('file', selectedFile);

    setUploading(true);

    try {
      const response =
        await championshipsApi.uploadMatchDocument(
          matchId,
          formData
        );

      setDocuments((current) => [
        response.data,
        ...current.filter(
          (document) => document.id !== response.data?.id
        ),
      ]);

      toast.success('Documento adicionado com sucesso');
      closeUploadForm();
    } catch (error) {
      console.error('Error uploading match document:', error);

      toast.error(
        error.response?.data?.detail ||
          'Erro ao adicionar o documento'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document) => {
    const confirmed = window.confirm(
      `Tem a certeza de que pretende eliminar “${
        document.title || document.original_filename
      }”?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(document.id);

    try {
      await championshipsApi.deleteMatchDocument(
        matchId,
        document.id
      );

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id)
      );

      toast.success('Documento eliminado com sucesso');
    } catch (error) {
      console.error('Error deleting match document:', error);

      toast.error(
        error.response?.data?.detail ||
          'Erro ao eliminar o documento'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (document) => {
    const downloadUrl = resolveDocumentUrl(document.url);

    if (!downloadUrl) {
      toast.error('O ficheiro deste documento não está disponível');
      return;
    }

    window.open(
      downloadUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      className="space-y-6"
      data-testid="match-documents"
    >
      <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
              <FileText className="h-5 w-5 text-primary" />
              Centro documental
            </CardTitle>

            <CardDescription className="mt-1">
              Documentos, relatórios e conteúdos associados a
              este jogo.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Atualizar
            </Button>

            {canManage && (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setShowUploadForm((current) => !current)
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar documento
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {canManage && showUploadForm && (
            <form
              onSubmit={handleUpload}
              className="space-y-5 rounded-3xl border border-primary/15 bg-primary/[0.03] p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-2.5">
                  <UploadCloud className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h3 className="font-heading font-semibold text-slate-950">
                    Novo documento
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adicione um ficheiro e defina como será
                    apresentado no Centro do Jogo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="match-document-file">
                    Ficheiro
                  </Label>

                  <Input
                    ref={fileInputRef}
                    id="match-document-file"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />

                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFile.name} ·{' '}
                      {formatFileSize(selectedFile.size)}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="match-document-title">
                    Título
                  </Label>

                  <Input
                    id="match-document-title"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="Ex.: Relatório técnico do jogo"
                    disabled={uploading}
                    maxLength={160}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match-document-category">
                    Categoria
                  </Label>

                  <select
                    id="match-document-category"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    disabled={uploading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match-document-visibility">
                    Visibilidade
                  </Label>

                  <select
                    id="match-document-visibility"
                    name="visibility"
                    value={form.visibility}
                    onChange={handleFormChange}
                    disabled={uploading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="match-document-description">
                    Descrição
                  </Label>

                  <textarea
                    id="match-document-description"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Descrição opcional do documento"
                    disabled={uploading}
                    rows={3}
                    maxLength={500}
                    className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeUploadForm}
                  disabled={uploading}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}

                  {uploading
                    ? 'A enviar...'
                    : 'Adicionar documento'}
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70">
              <div className="text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  A carregar documentos...
                </p>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <FileText className="h-7 w-7 text-slate-400" />
                </div>

                <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  Ainda não existem documentos
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  Os documentos adicionados a este jogo serão
                  apresentados nesta área.
                </p>

                {canManage && (
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => setShowUploadForm(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar primeiro documento
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {documents.map((document) => {
                const DocumentIcon =
                  getDocumentIcon(document);

                const isDeleting =
                  deletingId === document.id;

                return (
                  <article
                    key={document.id}
                    className="group rounded-3xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                          <DocumentIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-slate-950">
                            {document.title ||
                              document.original_filename ||
                              'Documento'}
                          </h3>

                          {document.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {document.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {getCategoryLabel(
                                document.category
                              )}
                            </Badge>

                            <Badge variant="outline">
                              {getVisibilityLabel(
                                document.visibility
                              )}
                            </Badge>

                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(
                                document.file_size
                              )}
                            </span>

                            <span className="text-xs text-muted-foreground">
                              {formatDocumentDate(
                                document.created_at
                              )}
                            </span>
                          </div>

                          {(document.original_filename ||
                            document.uploaded_by_name) && (
                            <p className="mt-2 truncate text-xs text-slate-400">
                              {document.original_filename}

                              {document.uploaded_by_name
                                ? ` · Adicionado por ${document.uploaded_by_name}`
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(document)
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Abrir
                        </Button>

                        {canManage && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={isDeleting}
                            onClick={() =>
                              handleDelete(document)
                            }
                          >
                            {isDeleting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}

                            Eliminar
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
