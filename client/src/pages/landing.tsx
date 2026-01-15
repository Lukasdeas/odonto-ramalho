import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeroBackground } from '@/components/hero-background';
import { FloatingParticles } from '@/components/webgl-background';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import logo_ from "@assets/logo-.png";
import whatsappQrCode from "@assets/qrcode_1767912298659.jpeg";
import type { ClinicSettings } from '@shared/schema';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SiInstagram, SiWhatsapp } from 'react-icons/si';
import { 
  Smile, 
  Calendar, 
  Users, 
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronDown,
  Star,
  Shield,
  Clock,
  CheckCircle,
  Sparkles,
  Heart,
  Award,
  Send,
  ExternalLink,
  QrCode
} from 'lucide-react';

import Design_sem_nome_1_ from "@assets/Design sem nome(1).png";

const services = [
  {
    icon: Sparkles,
    title: 'Clareamento Dental',
    description: 'Dentes mais brancos e brilhantes com tecnologia de ponta.',
  },
  {
    icon: Heart,
    title: 'Implantes Dentários',
    description: 'Recupere seu sorriso com implantes de alta qualidade.',
  },
  {
    icon: Award,
    title: 'Ortodontia',
    description: 'Aparelhos modernos e invisíveis para todas as idades.',
  },
  {
    icon: Smile,
    title: 'Estética Dental',
    description: 'Facetas, lentes de contato e harmonização do sorriso.',
  },
];

const benefits = [
  { icon: Clock, text: 'Atendimento humanizado' },
  { icon: Shield, text: 'Equipamentos modernos' },
  { icon: Star, text: 'Profissionais experientes' },
  { icon: CheckCircle, text: 'Ambiente acolhedor' },
];

const WHATSAPP_LINK = import.meta.env.VITE_WHATSAPP_LINK || '';
const INSTAGRAM_LINK = import.meta.env.VITE_INSTAGRAM_LINK || '';
const INSTAGRAM_USER = import.meta.env.VITE_INSTAGRAM_USER || 'odonto.ramalho';
const WHATSAPP_QRCODE = import.meta.env.VITE_WHATSAPP_QRCODE || '';

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    message: '',
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const { data: clinic } = useQuery<ClinicSettings>({
    queryKey: ['/api/public/clinic'],
  });


  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/public/contact-message', {
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientEmail: data.patientEmail || undefined,
        message: data.message || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada!",
        description: "Recebemos sua mensagem. Entraremos em contato em breve.",
      });
      setFormData({
        patientName: '',
        patientPhone: '',
        patientEmail: '',
        message: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.patientPhone) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha seu nome e telefone.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground className="z-0" />
        
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" className="text-foreground/80 hover:text-foreground" data-testid="button-login">
              Acesso Profissional
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <div 
          className={`relative z-30 text-center px-6 py-20 max-w-5xl mx-auto transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="flex justify-center mb-8">
            <img 
              src={Design_sem_nome_1_} 
              alt="Odonto Ramalho Logo" 
              className="h-32 md:h-44 w-auto object-contain drop-shadow-lg"
              data-testid="img-logo-hero"
            />
          </div>

          <p className="text-lg md:text-2xl text-foreground mb-4 font-medium">
            {clinic?.clinicDescription || 'Sua saúde bucal é nossa prioridade'}
          </p>
          
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">Aguardamos você!</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="px-8 py-6 text-lg shadow-lg"
              onClick={() => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-schedule-hero"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Agendar Consulta
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-6 text-lg"
              onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-services"
            >
              Nossos Serviços
            </Button>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 animate-bounce">
          <ChevronRight className="h-8 w-8 text-primary/50 rotate-90" />
        </div>
      </section>
      <section id="servicos" className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Nossos Tratamentos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Cuidamos do seu sorriso com excelência e tecnologia de ponta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card 
                key={service.title}
                className={`p-6 hover-elevate transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2 text-foreground">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-6">
                Por que escolher a {clinic?.clinicName || 'Odonto Ramalho'}?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Nossa clínica oferece um ambiente acolhedor e profissionais dedicados 
                a proporcionar o melhor cuidado para sua saúde bucal.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                {benefits.map((benefit) => (
                  <div key={benefit.text} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
              <Card className="relative bg-card">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Satisfação Garantida</p>
                      <p className="text-sm text-muted-foreground">Pacientes satisfeitos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Biossegurança</p>
                      <p className="text-sm text-muted-foreground">Protocolos rigorosos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Equipe Especializada</p>
                      <p className="text-sm text-muted-foreground">Profissionais qualificados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      <section id="agendar" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-wine opacity-90" />
        <FloatingParticles className="opacity-30" />
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
              Entre em Contato
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto text-lg">
              Envie uma mensagem ou entre em contato diretamente pelas nossas redes sociais.
            </p>
          </div>

          <Card className="bg-card/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-6">
                    Envie uma Mensagem
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientName">Nome Completo *</Label>
                      <Input
                        id="patientName"
                        placeholder="Seu nome"
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                        data-testid="input-patient-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="patientPhone">Telefone *</Label>
                      <Input
                        id="patientPhone"
                        placeholder="(11) 99999-9999"
                        value={formData.patientPhone}
                        onChange={(e) => setFormData({ ...formData, patientPhone: formatPhone(e.target.value) })}
                        data-testid="input-patient-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="patientEmail">E-mail (opcional)</Label>
                      <Input
                        id="patientEmail"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.patientEmail}
                        onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                        data-testid="input-patient-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem (opcional)</Label>
                      <Textarea
                        id="message"
                        placeholder="Como podemos ajudar você?"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="resize-none"
                        rows={4}
                        data-testid="textarea-message"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-contact"
                    >
                      {submitMutation.isPending ? (
                        "Enviando..."
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                </div>

                <div className="lg:border-l lg:pl-8 border-border">
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-6">
                    Nossas Redes
                  </h3>
                  <div className="space-y-4">
                    <Collapsible open={instagramOpen} onOpenChange={setInstagramOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover-elevate transition-all text-left"
                          data-testid="button-instagram-toggle"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
                            <SiInstagram className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">Instagram</p>
                            <p className="text-sm text-muted-foreground">@{INSTAGRAM_USER}</p>
                          </div>
                          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${instagramOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 pl-4">
                        <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                          <p className="text-sm text-muted-foreground text-center mb-3">
                            Acompanhe nosso trabalho e novidades
                          </p>
                          <Button
                            asChild
                            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 text-white border-0"
                          >
                            <a
                              href={INSTAGRAM_LINK || `https://instagram.com/${INSTAGRAM_USER}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid="link-instagram"
                            >
                              <SiInstagram className="mr-2 h-5 w-5" />
                              Seguir no Instagram
                            </a>
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible open={whatsappOpen} onOpenChange={setWhatsappOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover-elevate transition-all text-left"
                          data-testid="button-whatsapp-toggle"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500">
                            <SiWhatsapp className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">WhatsApp</p>
                            <p className="text-sm text-muted-foreground">Fale conosco pelo WhatsApp</p>
                          </div>
                          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${whatsappOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 pl-4">
                        <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <QrCode className="h-4 w-4" />
                              <span>Escaneie o QR Code</span>
                            </div>
                            <img 
                              src={whatsappQrCode} 
                              alt="QR Code WhatsApp" 
                              className="w-48 h-48 rounded-lg border bg-white p-2 object-contain"
                              data-testid="img-whatsapp-qrcode"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">ou</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          {WHATSAPP_LINK ? (
                            <Button
                              asChild
                              className="w-full bg-green-500 hover:bg-green-600 text-white border-0"
                            >
                              <a
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid="link-whatsapp"
                              >
                                <SiWhatsapp className="mr-2 h-5 w-5" />
                                Iniciar Conversa
                              </a>
                            </Button>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">
                              Link do WhatsApp em breve
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {clinic?.clinicPhone && (
                      <a
                        href={`tel:${clinic.clinicPhone}`}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover-elevate transition-all"
                        data-testid="link-phone"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Telefone</p>
                          <p className="text-sm text-muted-foreground">{clinic.clinicPhone}</p>
                        </div>
                      </a>
                    )}

                    {clinic?.clinicEmail && (
                      <a
                        href={`mailto:${clinic.clinicEmail}`}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover-elevate transition-all"
                        data-testid="link-email"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">E-mail</p>
                          <p className="text-sm text-muted-foreground">{clinic.clinicEmail}</p>
                        </div>
                      </a>
                    )}

                    {clinic?.clinicAddress && (
                      <div
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                        data-testid="text-address"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Endereço</p>
                          <p className="text-sm text-muted-foreground">{clinic.clinicAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <footer className="py-12 px-6 bg-card border-t">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                <Smile className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-heading text-lg font-semibold">
                {clinic?.clinicName || 'Odonto Ramalho'}
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm">
              Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
