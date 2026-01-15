import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Trash2, Loader2, Stethoscope, Mail, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type DentistUser = Omit<User, "password">;

export default function DentistasPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDentist, setSelectedDentist] = useState<DentistUser | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "dentist" as "dentist" | "admin",
  });

  const { data: dentists, isLoading } = useQuery<DentistUser[]>({
    queryKey: ["/api/dentists"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/dentists", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dentists"] });
      toast({ title: "Dentista cadastrado com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/dentists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dentists"] });
      toast({ title: "Dentista excluído com sucesso!" });
      setDeleteDialogOpen(false);
      setSelectedDentist(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      role: "dentist",
    });
  };

  const filteredDentists = dentists?.filter((dentist) =>
    dentist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dentist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dentist.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Preencha todos os campos obrigatórios",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (dentist: DentistUser) => {
    setSelectedDentist(dentist);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDentist) {
      deleteMutation.mutate(selectedDentist.id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas administradores da clínica podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 animate-fadeIn overflow-y-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Dentistas</h1>
          <p className="text-muted-foreground">
            Gerencie os dentistas da clínica
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-dentist">
          <Plus className="mr-2 h-4 w-4" />
          Novo Dentista
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, usuário ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-dentists"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-lg font-heading">
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              `${filteredDentists?.length || 0} dentistas`
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto h-[calc(100%-60px)]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDentists && filteredDentists.length > 0 ? (
            <div className="divide-y">
              {filteredDentists.map((dentist) => (
                <div
                  key={dentist.id}
                  className="flex items-center gap-4 p-4"
                  data-testid={`dentist-row-${dentist.id}`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(dentist.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{dentist.name}</p>
                      <Badge variant={dentist.role === "admin" ? "default" : "secondary"} size="sm">
                        {dentist.role === "admin" ? "Admin" : "Dentista"}
                      </Badge>
                      {dentist.id === currentUser?.id && (
                        <Badge variant="outline" size="sm">Você</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {dentist.username}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {dentist.email}
                      </span>
                    </div>
                  </div>
                  {dentist.id !== currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(dentist)}
                      data-testid={`button-delete-dentist-${dentist.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Stethoscope className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Nenhum dentista encontrado</p>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Tente uma busca diferente"
                  : "Cadastre seu primeiro dentista"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Dentista
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Novo Dentista</DialogTitle>
            <DialogDescription>
              Preencha os dados do dentista. Todos os campos são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. João Silva"
                required
                data-testid="input-dentist-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="joao.silva"
                required
                data-testid="input-dentist-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
                data-testid="input-dentist-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Senha inicial"
                required
                data-testid="input-dentist-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Acesso</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "dentist" | "admin") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger data-testid="select-dentist-role">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dentist">Dentista</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-dentist">
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dentista?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedDentist?.name}</strong>? 
              Esta ação não pode ser desfeita e os pacientes deste dentista precisarão ser transferidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-dentist"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
