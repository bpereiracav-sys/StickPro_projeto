import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';

export function BackButton({
  label = 'Voltar',
  fallbackPath = '/dashboard',
  className = '',
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackPath);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`h-9 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-950 ${className}`}
      data-testid="back-button"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}

export default BackButton;
