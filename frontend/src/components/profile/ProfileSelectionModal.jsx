import { useState } from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { User, Users, ChevronRight, Shield } from 'lucide-react';
import { getInitials, getRoleName } from '../../lib/utils';

export function ProfileSelectionModal({ 
  open, 
  onOpenChange, 
  profiles, 
  onSelectProfile,
  currentUser 
}) {
  const [selecting, setSelecting] = useState(false);

  const handleSelect = async (profile) => {
    setSelecting(true);
    try {
      await onSelectProfile(profile);
      onOpenChange(false);
    } catch (error) {
      console.error('Error selecting profile:', error);
    } finally {
      setSelecting(false);
    }
  };

  // Group profiles by type
  const selfProfiles = profiles.filter(p => p.type === 'self');
  const associatedProfiles = profiles.filter(p => p.type === 'associated');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-md" data-testid="profile-selection-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-wide flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            SELECIONAR PERFIL
          </DialogTitle>
          <DialogDescription>
            Escolha como pretende aceder à aplicação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Self profiles */}
          {selfProfiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                A minha conta
              </p>
              {selfProfiles.map((profile, index) => (
                <button
                  key={`self-${index}`}
                  onClick={() => handleSelect(profile)}
                  disabled={selecting}
                  className="w-full flex items-center gap-3 p-4 border border-border rounded-sm hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  data-testid={`profile-self-${profile.role}`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-white text-lg">
                      {getInitials(profile.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{profile.user_name}</p>
                    <Badge variant="outline" className="mt-1">
                      {getRoleName(profile.role)}
                    </Badge>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Associated profiles */}
          {associatedProfiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Contas associadas (como responsável)
              </p>
              {associatedProfiles.map((profile, index) => (
                <button
                  key={`assoc-${index}`}
                  onClick={() => handleSelect(profile)}
                  disabled={selecting}
                  className="w-full flex items-center gap-3 p-4 border border-amber-200 bg-amber-50 rounded-sm hover:border-amber-400 transition-colors text-left"
                  data-testid={`profile-associated-${profile.user_id}`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-amber-500 text-white text-lg">
                      {getInitials(profile.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{profile.user_name}</p>
                    <p className="text-xs text-muted-foreground">{profile.label}</p>
                    {profile.teams?.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {profile.teams.map(t => t.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Continuar sem selecionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProfileSelectionModal;
