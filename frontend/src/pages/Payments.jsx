import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useLanguage } from '../context/LanguageContext';
import { paymentsApi, membersApi } from '../services/api';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

import { toast } from 'sonner';
import {
  CreditCard,
  Euro,
  Calendar,
  Check,
  Clock,
  AlertCircle,
  Plus,
  Upload,
  FileText,
  Loader2,
  Trash2,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Receipt,
  TrendingUp,
  Search,
  Filter,
  ShieldAlert,
  Eye,
} from 'lucide-react';

import { formatDate, normalizeRole } from '../lib/utils';

const PLAYER_ROLES = ['jogador', 'player'];
const BLOCKED_FINANCE_ROLES = [
  'treinador',
  'treinador_adjunto',
  'delegado',
  'coach',
  'assistant_coach',
  'delegate',
];

function getMonthOptions() {
  return [
    { value: '1', label: 'Jan' },
    { value: '2', label: 'Fev' },
    { value: '3', label: 'Mar' },
    { value: '4', label: 'Abr' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' },
    { value: '8', label: 'Ago' },
    { value: '9', label: 'Set' },
    { value: '10', label: 'Out' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dez' },
  ];
}

function getMonthName(month) {
  const found = getMonthOptions().find((m) => Number(m.value) === Number(month));
  return found?.label || '';
}

function isPlayerMember(member) {
  return PLAYER_ROLES.includes(normalizeRole(member?.role || ''));
}

export default function Payments() {
  const { user, effectiveRole } = useAuth();
  const permissions = usePermissions();
  const { t } = useLanguage();

  const isAdmin = permissions?.isAdmin;
  const isFamilyMember = permissions?.isFamilyMember;
  const isPlayer = permissions?.isPlayer;

  const role = normalizeRole(effectiveRole || user?.role || '');
  const canViewFinance = isAdmin || isPlayer || isFamilyMember;
  const isFinanceBlockedRole = BLOCKED_FINANCE_ROLES.includes(role);

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const [showCreateFeeDialog, setShowCreateFeeDialog] = useState(false);
  const [showBulkFeeDialog, setShowBulkFeeDialog] = useState(false);
  const [showCustomPaymentDialog, setShowCustomPaymentDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState(null);

  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [feeForm, setFeeForm] = useState({
    user_id: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    due_date: '',
    notes: '',
  });

  const [bulkFeeForm, setBulkFeeForm] = useState({
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    due_date: '',
  });

  const [customForm, setCustomForm] = useState({
    user_id: '',
    title: '',
    description: '',
    amount: '',
    due_date: '',
  });

  useEffect(() => {
    if (!canViewFinance && isFinanceBlockedRole) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [canViewFinance, isFinanceBlockedRole, isAdmin]);

  const fetchData = async () => {
    setLoading(true);

    try {
      if (isAdmin) {
        const [paymentsRes, summaryRes, membersRes] = await Promise.all([
          paymentsApi.getAll(),
          paymentsApi.getSummary(),
          membersApi.getAll({ limit: 500 }),
        ]);

        setPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);
        setSummary(summaryRes?.data || null);
        setMembers(membersRes?.data?.users || membersRes?.data?.members || []);
      } else {
        const paymentsRes = await paymentsApi.getMy();
        setPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);
        setSummary(null);
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erro ao carregar pagamentos');
      setPayments([]);
      setSummary(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const playerMembers = useMemo(() => {
    return members.filter(isPlayerMember);
  }, [members]);

  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((payment) => payment.type === typeFilter);
    }

    if (monthFilter !== 'all') {
      filtered = filtered.filter((payment) => {
        if (payment.type === 'monthly_fee' && payment.month) {
          return String(payment.month) === monthFilter;
        }

        if (payment.due_date) {
          const dueDate = new Date(payment.due_date);
          return String(dueDate.getMonth() + 1) === monthFilter;
        }

        return false;
      });
    }

    if (memberFilter !== 'all') {
      filtered = filtered.filter(
        (payment) => String(payment.user_id) === String(memberFilter)
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter((payment) => {
        const fields = [
          payment.user_name,
          payment.user_email,
          payment.title,
          payment.description,
          payment.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return fields.includes(query);
      });
    }

    return filtered;
  }, [payments, statusFilter, typeFilter, monthFilter, memberFilter, searchQuery]);

  const stats = useMemo(() => {
    const paid = payments.filter((payment) => payment.status === 'paid').length;
    const pending = payments.filter((payment) => payment.status === 'pending').length;
    const overdue = payments.filter((payment) => payment.status === 'overdue').length;
    const total = payments.reduce((acc, payment) => acc + (Number(payment.amount) || 0), 0);
    const collected = payments
      .filter((payment) => payment.status === 'paid')
      .reduce((acc, payment) => acc + (Number(payment.amount) || 0), 0);

    return { paid, pending, overdue, total, collected };
  }, [payments]);

  const handleCreateFee = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await paymentsApi.createMonthlyFee({
        user_id: feeForm.user_id,
        amount: parseFloat(feeForm.amount),
        month: parseInt(feeForm.month, 10),
        year: parseInt(feeForm.year, 10),
        due_date: new Date(feeForm.due_date).toISOString(),
        notes: feeForm.notes || null,
      });

      toast.success('Mensalidade criada');
      setShowCreateFeeDialog(false);
      resetFeeForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar mensalidade');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBulkFees = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const result = await paymentsApi.createBulkFees({
        month: parseInt(bulkFeeForm.month, 10),
        year: parseInt(bulkFeeForm.year, 10),
        amount: parseFloat(bulkFeeForm.amount),
        due_date: new Date(bulkFeeForm.due_date).toISOString(),
      });

      toast.success(result?.data?.message || 'Mensalidades criadas');
      setShowBulkFeeDialog(false);
      resetBulkFeeForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar mensalidades');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCustomPayment = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await paymentsApi.createCustom({
        user_id: customForm.user_id,
        title: customForm.title,
        description: customForm.description || null,
        amount: parseFloat(customForm.amount),
        due_date: new Date(customForm.due_date).toISOString(),
      });

      toast.success('Pagamento criado');
      setShowCustomPaymentDialog(false);
      resetCustomForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar pagamento');
    } finally {
      setCreating(false);
    }
  };

  const handleImportFees = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const result = await paymentsApi.importFees(file);
      toast.success(result?.data?.message || 'Importação concluída');

      if (result?.data?.errors?.length > 0) {
        result.data.errors.forEach((err) => toast.warning(err));
      }

      setShowImportDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao importar');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleMarkPaid = async (payment) => {
    setMarkingPaid(payment.id);

    try {
      await paymentsApi.markPaid(payment.type, payment.id);
      toast.success('Pagamento marcado como pago');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao marcar pagamento');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleUploadProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPayment) return;

    setUploadingProof(true);

    try {
      await paymentsApi.uploadProof(selectedPayment.type, selectedPayment.id, file);
      toast.success('Comprovativo carregado');
      setShowProofDialog(false);
      setSelectedPayment(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao carregar comprovativo');
    } finally {
      setUploadingProof(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (payment) => {
    const confirmed = window.confirm('Tem a certeza que quer eliminar este pagamento?');
    if (!confirmed) return;

    setDeleting(payment.id);

    try {
      await paymentsApi.delete(payment.type, payment.id);
      toast.success('Pagamento eliminado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao eliminar pagamento');
    } finally {
      setDeleting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);

    try {
      const params = {};

      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.payment_type = typeFilter;
      if (monthFilter !== 'all') params.month = monthFilter;
      if (memberFilter !== 'all') params.user_id = memberFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await paymentsApi.exportExcel(params);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];

      link.href = url;
      link.download = `pagamentos_${timestamp}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Exportação concluída');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const resetFeeForm = () => {
    setFeeForm({
      user_id: '',
      amount: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      due_date: '',
      notes: '',
    });
  };

  const resetBulkFeeForm = () => {
    setBulkFeeForm({
      amount: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      due_date: '',
    });
  };

  const resetCustomForm = () => {
    setCustomForm({
      user_id: '',
      title: '',
      description: '',
      amount: '',
      due_date: '',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            Pago
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            Pendente
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            Atrasado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!canViewFinance && isFinanceBlockedRole) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" data-testid="payments-blocked-page">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl tracking-tight flex items-center gap-3">
            <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            Pagamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acesso condicionado por perfil
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-8">
            <div className="flex items-start gap-4">
              <ShieldAlert className="w-6 h-6 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Sem acesso a pagamentos</p>
                <p className="text-sm text-amber-700 mt-1">
                  O perfil atual não tem permissão para consultar ou gerir informação financeira.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6" data-testid="payments-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl tracking-tight flex items-center gap-3">
            <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            Pagamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'Gestão de mensalidades e pagamentos' : 'Os meus pagamentos'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowBulkFeeDialog(true)}>
              <Users className="w-4 h-4 mr-2" />
              Em Massa
            </Button>

            <Button size="sm" onClick={() => setShowCreateFeeDialog(true)} data-testid="create-fee-btn">
              <Plus className="w-4 h-4 mr-2" />
              Mensalidade
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCustomPaymentDialog(true)}
              data-testid="create-custom-btn"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pagamento
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={exporting || payments.length === 0}
              data-testid="export-payments-btn"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar
            </Button>
          </div>
        )}
      </div>

      {isAdmin && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-green-200 bg-green-50/50 card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cobrado (mês)</p>
                  <p className="text-lg sm:text-xl font-bold text-green-700 font-mono">
                    €{Number(summary.collected_this_month || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-yellow-200 bg-yellow-50/50 card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-lg sm:text-xl font-bold text-yellow-700 font-mono">
                    €{Number(summary.total_pending || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.pending_count || 0} pagamentos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-red-200 bg-red-50/50 card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Em Atraso</p>
                  <p className="text-lg sm:text-xl font-bold text-red-700 font-mono">
                    €{Number(summary.total_overdue || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.overdue_count || 0} pagamentos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pagos (mês)</p>
                  <p className="text-lg sm:text-xl font-bold font-mono">
                    {summary.paid_count_this_month || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">pagamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Pesquisar por nome, email ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="payment-search"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]" data-testid="status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="overdue">Atrasados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="monthly_fee">Mensalidades</SelectItem>
              <SelectItem value="custom_payment">Pagamentos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Todos os meses</SelectItem>
              {getMonthOptions().map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Membro" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-72">
              <SelectItem value="all">Todos os membros</SelectItem>
              {playerMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {isAdmin ? 'Todos os Pagamentos' : 'Os Meus Pagamentos'}
          </CardTitle>
          <CardDescription className="text-sm">
            {filteredPayments.length} pagamento{filteredPayments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {isAdmin && <TableHead>Atleta</TableHead>}
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Valor</TableHead>
                    <TableHead className="text-center">Vencimento</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Comprovativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`payment-${payment.id}`}>
                      {isAdmin && (
                        <TableCell>
                          <div>
                            {payment.user_id ? (
                              <Link
                                to={`/members/${payment.user_id}/profile`}
                                className="font-medium text-primary hover:underline"
                              >
                                {payment.user_name || 'N/A'}
                              </Link>
                            ) : (
                              <p className="font-medium">{payment.user_name || 'N/A'}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                          </div>
                        </TableCell>
                      )}

                      <TableCell>
                        {payment.type === 'monthly_fee' ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              Mensalidade {getMonthName(payment.month)}/{payment.year}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">{payment.title}</p>
                            {payment.description && (
                              <p className="text-xs text-muted-foreground">{payment.description}</p>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-mono font-bold">
                        €{Number(payment.amount || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-center">
                        {formatDate(payment.due_date)}
                      </TableCell>

                      <TableCell className="text-center">
                        {getStatusBadge(payment.status)}
                      </TableCell>

                      <TableCell className="text-center">
                        {payment.proof_url ? (
                          <a
                            href={payment.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-xs">Ver</span>
                          </a>
                        ) : payment.status !== 'paid' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowProofDialog(true);
                            }}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && payment.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkPaid(payment)}
                              disabled={markingPaid === payment.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              data-testid={`mark-paid-${payment.id}`}
                            >
                              {markingPaid === payment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          )}

                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(payment)}
                              disabled={deleting === payment.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deleting === payment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Euro className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Nenhum pagamento encontrado</p>
              {isAdmin && (
                <Button className="mt-4" size="sm" onClick={() => setShowCreateFeeDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Mensalidade
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isAdmin && payments.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg tracking-tight">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{stats.paid}</p>
                <p className="text-xs text-muted-foreground">Pagos</p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateFeeDialog} onOpenChange={setShowCreateFeeDialog}>
        <DialogContent className="bg-white" data-testid="create-fee-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              Criar Mensalidade
            </DialogTitle>
            <DialogDescription>
              Criar uma nova mensalidade para um jogador
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFee}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jogador *</Label>
                <Select
                  value={feeForm.user_id}
                  onValueChange={(v) => setFeeForm((prev) => ({ ...prev, user_id: v }))}
                >
                  <SelectTrigger data-testid="select-player">
                    <SelectValue placeholder="Selecionar jogador" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    {playerMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês *</Label>
                  <Select
                    value={String(feeForm.month)}
                    onValueChange={(v) =>
                      setFeeForm((prev) => ({ ...prev, month: parseInt(v, 10) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {getMonthOptions().map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Select
                    value={String(feeForm.year)}
                    onValueChange={(v) =>
                      setFeeForm((prev) => ({ ...prev, year: parseInt(v, 10) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    data-testid="fee-amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input
                    type="date"
                    value={feeForm.due_date}
                    onChange={(e) =>
                      setFeeForm((prev) => ({ ...prev, due_date: e.target.value }))
                    }
                    required
                    data-testid="fee-due-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={feeForm.notes}
                  onChange={(e) => setFeeForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionais..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateFeeDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-fee">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkFeeDialog} onOpenChange={setShowBulkFeeDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Mensalidades em Massa
            </DialogTitle>
            <DialogDescription>
              Criar mensalidades para todos os jogadores ativos
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBulkFees}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês *</Label>
                  <Select
                    value={String(bulkFeeForm.month)}
                    onValueChange={(v) =>
                      setBulkFeeForm((prev) => ({ ...prev, month: parseInt(v, 10) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {getMonthOptions().map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Select
                    value={String(bulkFeeForm.year)}
                    onValueChange={(v) =>
                      setBulkFeeForm((prev) => ({ ...prev, year: parseInt(v, 10) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={bulkFeeForm.amount}
                    onChange={(e) =>
                      setBulkFeeForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input
                    type="date"
                    value={bulkFeeForm.due_date}
                    onChange={(e) =>
                      setBulkFeeForm((prev) => ({ ...prev, due_date: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Serão criadas mensalidades para todos os jogadores ativos que não tenham
                pagamentos desativados.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBulkFeeDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Mensalidades'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomPaymentDialog} onOpenChange={setShowCustomPaymentDialog}>
        <DialogContent className="bg-white" data-testid="create-custom-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              Criar Pagamento
            </DialogTitle>
            <DialogDescription>
              Criar um pagamento personalizado para um jogador
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomPayment}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jogador *</Label>
                <Select
                  value={customForm.user_id}
                  onValueChange={(v) => setCustomForm((prev) => ({ ...prev, user_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar jogador" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    {playerMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={customForm.title}
                  onChange={(e) =>
                    setCustomForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Ex: Equipamento, inscrição torneio..."
                  required
                  data-testid="custom-title"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={customForm.description}
                  onChange={(e) =>
                    setCustomForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Detalhes adicionais..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={customForm.amount}
                    onChange={(e) =>
                      setCustomForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    required
                    data-testid="custom-amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input
                    type="date"
                    value={customForm.due_date}
                    onChange={(e) =>
                      setCustomForm((prev) => ({ ...prev, due_date: e.target.value }))
                    }
                    required
                    data-testid="custom-due-date"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomPaymentDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-custom">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Importar Mensalidades
            </DialogTitle>
            <DialogDescription>
              Importar mensalidades a partir de um ficheiro Excel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-sm">
              <p className="text-sm font-medium mb-2">Colunas esperadas:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • <strong>Email</strong> - Email do jogador
                </li>
                <li>
                  • <strong>Valor</strong> ou <strong>Amount</strong> - Valor
                </li>
                <li>
                  • <strong>Mês</strong> - Número do mês (1-12)
                </li>
                <li>
                  • <strong>Ano</strong> - Ano (ex: 2026)
                </li>
                <li>
                  • <strong>Vencimento</strong> - Data limite (opcional)
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Selecionar ficheiro</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFees}
                disabled={importing}
                className="cursor-pointer"
              />
            </div>

            {importing && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                A importar...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Carregar Comprovativo
            </DialogTitle>
            <DialogDescription>
              Anexar comprovativo de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPayment && (
              <div className="p-3 bg-muted/30 rounded-sm">
                <p className="text-sm">
                  {selectedPayment.type === 'monthly_fee'
                    ? `Mensalidade ${getMonthName(selectedPayment.month)}/${selectedPayment.year}`
                    : selectedPayment.title}
                </p>
                <p className="text-lg font-bold">
                  €{Number(selectedPayment.amount || 0).toFixed(2)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Ficheiro (PDF, JPG, PNG)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleUploadProof}
                disabled={uploadingProof}
                className="cursor-pointer"
                data-testid="proof-file-input"
              />
            </div>

            {uploadingProof && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                A carregar...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowProofDialog(false);
                setSelectedPayment(null);
              }}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
