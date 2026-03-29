import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { subscriptionApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertTriangle,
  Download,
  Receipt,
  Building,
  Loader2,
  Star,
  Zap
} from 'lucide-react';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const isAdmin = ['admin', 'gestor_desportivo'].includes(user?.role);

  useEffect(() => {
    fetchSubscription();
    fetchInvoices();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await subscriptionApi.get();
      setSubscription(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await subscriptionApi.getInvoices();
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await subscriptionApi.cancel();
      toast.success(t('subscription.cancelledSuccess'));
      fetchSubscription();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handlePaymentMethodChange = async (method) => {
    setUpdatingPayment(true);
    try {
      await subscriptionApi.update({ payment_method: method });
      setSubscription({ ...subscription, payment_method: method });
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    if (invoice.file_url) {
      window.open(invoice.file_url, '_blank');
    } else {
      try {
        const response = await subscriptionApi.downloadInvoice(invoice.id);
        if (response.data.download_url) {
          window.open(response.data.download_url, '_blank');
        } else {
          toast.error(t('subscription.invoiceNotAvailable'));
        }
      } catch (error) {
        toast.error(t('subscription.invoiceNotAvailable'));
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: t('subscription.statusActive') },
      expired: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: t('subscription.statusExpired') },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, label: t('subscription.statusCancelled') },
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: t('subscription.statusPending') }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={`${config.color} border gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (status) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800', label: t('subscription.invoicePaid') },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: t('subscription.invoicePending') },
      overdue: { color: 'bg-red-100 text-red-800', label: t('subscription.invoiceOverdue') },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: t('subscription.invoiceCancelled') }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getPlanBadge = (planType) => {
    if (planType === 'plus') {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
          <Zap className="w-3 h-3" />
          Plus
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Star className="w-3 h-3" />
        Standard
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="subscription-page">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
          {(t('subscription.title') || 'Subscrição').toUpperCase()}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('subscription.description') || 'Gerir a subscrição e faturação do clube'}
        </p>
      </div>

      {/* Subscription Summary */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-heading text-xl tracking-tight">
                  {t('subscription.summary') || 'Resumo da Subscrição'}
                </CardTitle>
                <CardDescription>
                  {t('subscription.summaryDescription') || 'Detalhes do plano atual'}
                </CardDescription>
              </div>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Member Count */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{t('subscription.memberCount') || 'Membros'}</span>
                </div>
                <p className="text-3xl font-heading text-primary">{subscription.member_count || 0}</p>
                <p className="text-xs text-muted-foreground">{t('subscription.activeAccounts') || 'contas ativas'}</p>
              </div>

              {/* Plan Type */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="w-4 h-4" />
                  <span className="text-sm">{t('subscription.planType') || 'Plano'}</span>
                </div>
                <div className="pt-1">
                  {getPlanBadge(subscription.plan_type)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {subscription.plan_type === 'plus' 
                    ? t('subscription.plusFeatures') || 'Funcionalidades avançadas'
                    : t('subscription.standardFeatures') || 'Funcionalidades base'}
                </p>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{t('subscription.startDate') || 'Início'}</span>
                </div>
                <p className="text-lg font-semibold">{formatDate(subscription.start_date)}</p>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{t('subscription.endDate') || 'Término'}</span>
                </div>
                <p className="text-lg font-semibold">{formatDate(subscription.end_date)}</p>
                <p className="text-xs text-muted-foreground">
                  {subscription.status === 'active' && t('subscription.autoRenew') || 'renovação automática'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-muted-foreground">{t('subscription.notFound') || 'Subscrição não encontrada'}</p>
            </div>
          )}

          {/* Cancel Button */}
          {subscription && subscription.status === 'active' && isAdmin && (
            <div className="mt-6 pt-6 border-t border-border">
              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={() => setShowCancelDialog(true)}
                data-testid="cancel-subscription-btn"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t('subscription.cancel') || 'Cancelar Subscrição'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            {(t('subscription.paymentMethod') || 'Método de Pagamento').toUpperCase()}
          </CardTitle>
          <CardDescription>
            {t('subscription.paymentMethodDescription') || 'Selecione como pretende efetuar os pagamentos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-4">
            <Select 
              value={subscription?.payment_method || 'bank_transfer'} 
              onValueChange={handlePaymentMethodChange}
              disabled={updatingPayment || !isAdmin}
            >
              <SelectTrigger data-testid="payment-method-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="credit_card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {t('subscription.creditCard') || 'Cartão de Crédito'}
                  </div>
                </SelectItem>
                <SelectItem value="bank_transfer">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {t('subscription.bankTransfer') || 'Transferência Bancária'}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {subscription?.payment_method === 'bank_transfer' && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">{t('subscription.bankDetails') || 'Dados Bancários'}:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>IBAN: PT50 0000 0000 0000 0000 0000 0</p>
                  <p>BIC/SWIFT: CGDIPTPL</p>
                  <p>{t('subscription.reference') || 'Referência'}: STICKPRO-{subscription?.id?.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing / Invoices */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {(t('subscription.billing') || 'Faturação').toUpperCase()}
          </CardTitle>
          <CardDescription>
            {t('subscription.billingDescription') || 'Histórico de faturas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('subscription.noInvoices') || 'Sem faturas'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('subscription.noInvoicesHint') || 'As faturas aparecerão aqui quando forem geradas'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('subscription.invoiceNumber') || 'Nº Fatura'}</TableHead>
                    <TableHead>{t('subscription.period') || 'Período'}</TableHead>
                    <TableHead className="text-center">{t('subscription.members') || 'Membros'}</TableHead>
                    <TableHead className="text-right">{t('subscription.pricePerMember') || 'Preço/Membro'}</TableHead>
                    <TableHead className="text-right">{t('subscription.totalDue') || 'Total'}</TableHead>
                    <TableHead className="text-right">{t('subscription.totalPaid') || 'Pago'}</TableHead>
                    <TableHead className="text-center">{t('common.status') || 'Estado'}</TableHead>
                    <TableHead className="text-center">{t('common.actions') || 'Ações'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(invoice.start_date)} - {formatDate(invoice.end_date)}
                      </TableCell>
                      <TableCell className="text-center">{invoice.paying_members}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.price_per_member)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(invoice.total_due)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(invoice.total_paid)}</TableCell>
                      <TableCell className="text-center">{getInvoiceStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={!invoice.file_url}
                          data-testid={`download-invoice-${invoice.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t('subscription.cancelTitle') || 'Cancelar Subscrição'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('subscription.cancelWarning') || 'Tem a certeza que pretende cancelar a subscrição? Esta ação não pode ser revertida e perderá acesso às funcionalidades do plano.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleCancelSubscription}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('subscription.confirmCancel') || 'Sim, Cancelar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
