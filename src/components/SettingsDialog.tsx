import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Globe, Bell, BellOff, Volume2, VolumeX, Info, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation, languageNames, type Language } from '@/hooks/useTranslation';
import { CrossLogo } from '@/components/CrossLogo';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const SettingsDialog = () => {
  const { language, setLanguage, t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('catholink_sound') !== 'false';
  });

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'));
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    setPushEnabled(permission === 'granted');
  }, [open]);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  };

  const togglePush = async () => {
    if (!pushEnabled && typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setPushEnabled(perm === 'granted');
    } else {
      setPushEnabled(!pushEnabled);
    }
  };

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('catholink_sound', String(newVal));
  };

  const languages = Object.entries(languageNames) as [Language, string][];

  if (showLanguages) {
    return (
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowLanguages(false); }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowLanguages(false)} className="mr-1 h-8 px-2">
                ← {t('common.back')}
              </Button>
              <Globe className="h-5 w-5 text-primary" />
              {t('settings.select_language')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-2">
            <div className="grid grid-cols-1 gap-1.5">
              {languages.map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => {
                    setLanguage(code);
                    setShowLanguages(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                    language === code 
                      ? 'bg-primary/10 border-2 border-primary text-primary font-semibold'
                      : 'bg-card border border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="text-sm">{name}</span>
                  <span className="text-xs text-muted-foreground uppercase">{code}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setShowLanguages(false); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t('settings.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Appearance */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('settings.appearance')}
            </h4>
            <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-amber-500" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{t('settings.dark_mode')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.dark_mode_desc')}</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </div>

          <Separator />

          {/* Language */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('settings.language')}
            </h4>
            <button
              onClick={() => setShowLanguages(true)}
              className="w-full flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{t('settings.language')}</p>
                  <p className="text-xs text-muted-foreground">{languageNames[language]}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <Separator />

          {/* Notifications */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('settings.notifications')}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  {pushEnabled ? <Bell className="h-5 w-5 text-green-500" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('settings.push_notifications')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.push_desc')}</p>
                  </div>
                </div>
                <Switch checked={pushEnabled} onCheckedChange={togglePush} />
              </div>
              <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('settings.sound')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.sound_desc')}</p>
                  </div>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
              </div>
            </div>
          </div>

          <Separator />

          {/* About */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('settings.about')}
            </h4>
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CrossLogo size={40} />
                <div>
                  <p className="text-sm font-bold text-foreground">CathoLink</p>
                  <p className="text-xs text-muted-foreground">{t('settings.version')} 1.0.0</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('settings.app_description')}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs flex-1"
                  onClick={() => { setOpen(false); navigate('/terms'); }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {t('settings.terms')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs flex-1"
                  onClick={() => { setOpen(false); navigate('/about'); }}
                >
                  <Info className="h-3 w-3 mr-1" />
                  {t('settings.about_app')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
