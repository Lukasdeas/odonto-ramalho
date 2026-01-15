import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  FileText,
  Calendar,
  Loader2,
  Smile,
  Pencil,
  Image,
  Upload,
  X,
  Download,
  Trash2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Camera,
  FileImage,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient, DentalRecordWithImages, RecordImage } from "@shared/schema";

function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return parseISO(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const procedures = [
  "Consulta",
  "Limpeza",
  "Restauração Resina",
  "Restauração Amálgama",
  "Extração Simples",
  "Extração Cirúrgica",
  "Tratamento de Canal",
  "Clareamento",
  "Aplicação de Flúor",
  "Raspagem",
  "Profilaxia",
  "Radiografia",
  "Prótese Fixa",
  "Prótese Removível",
  "Implante",
  "Ortodontia",
  "Gengivectomia",
  "Cirurgia Periodontal",
  "Retorno",
  "Outros",
];

const imageTypes = [
  { value: "exam", label: "Exame" },
  { value: "xray", label: "Radiografia" },
  { value: "photo", label: "Foto Clínica" },
  { value: "before", label: "Antes do Tratamento" },
  { value: "after", label: "Após Tratamento" },
  { value: "document", label: "Documento" },
];

// Helper to generate authenticated image URL
function getImageUrl(filename: string): string {
  const token = localStorage.getItem("token");
  return `/api/uploads/${filename}?token=${encodeURIComponent(token || "")}`;
}

interface ImageGalleryProps {
  images: RecordImage[];
  onDelete: (id: string) => void;
  onViewImage: (image: RecordImage, allImages: RecordImage[]) => void;
  isDeleting: boolean;
}

function ImageGallery({ images, onDelete, onViewImage, isDeleting }: ImageGalleryProps) {
  if (!images || images.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((image) => {
        const isImage = image.mimeType.startsWith("image/");
        return (
          <div
            key={image.id}
            className="group relative w-20 h-20 rounded-md overflow-hidden border bg-muted/30 hover-elevate cursor-pointer"
            onClick={() => onViewImage(image, images)}
            data-testid={`image-thumbnail-${image.id}`}
          >
            {isImage ? (
              <img
                src={getImageUrl(image.filename)}
                alt={image.originalName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileImage className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewImage(image, images);
                }}
                data-testid={`button-view-image-${image.id}`}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image.id);
                }}
                disabled={isDeleting}
                data-testid={`button-delete-image-${image.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Badge
              variant="secondary"
              className="absolute bottom-0 left-0 right-0 rounded-none text-[10px] py-0.5 truncate"
            >
              {imageTypes.find((t) => t.value === image.imageType)?.label || "Exame"}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

interface ImageViewerProps {
  image: RecordImage | null;
  allImages: RecordImage[];
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}

function ImageViewer({ image, allImages, onClose, onNavigate }: ImageViewerProps) {
  if (!image) return null;

  const currentIndex = allImages.findIndex((img) => img.id === image.id);
  const isImage = image.mimeType.startsWith("image/");

  return (
    <Dialog open={!!image} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{image.originalName}</DialogTitle>
              <DialogDescription>
                {imageTypes.find((t) => t.value === image.imageType)?.label || "Exame"}
                {image.description && ` - ${image.description}`}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getImageUrl(image.filename)}
                download={image.originalName}
                className="inline-flex"
              >
                <Button size="icon" variant="outline" data-testid="button-download-image">
                  <Download className="h-4 w-4" />
                </Button>
              </a>
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 relative bg-black/90 flex items-center justify-center overflow-hidden">
          {allImages.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
                onClick={() => onNavigate("prev")}
                disabled={currentIndex === 0}
                data-testid="button-prev-image"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
                onClick={() => onNavigate("next")}
                disabled={currentIndex === allImages.length - 1}
                data-testid="button-next-image"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          {isImage ? (
            <img
              src={getImageUrl(image.filename)}
              alt={image.originalName}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center text-white p-8">
              <FileImage className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{image.originalName}</p>
              <p className="text-sm opacity-75 mt-1">
                Este arquivo não pode ser visualizado aqui
              </p>
              <a href={getImageUrl(image.filename)} download={image.originalName}>
                <Button className="mt-4" variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Arquivo
                </Button>
              </a>
            </div>
          )}
        </div>
        {allImages.length > 1 && (
          <div className="p-3 border-t bg-muted/30 flex items-center justify-center gap-1">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} de {allImages.length}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ProntuariosPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialPatientId = params.get("patient") || "";
  
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadRecordId, setUploadRecordId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<DentalRecordWithImages | null>(null);
  const [viewingImage, setViewingImage] = useState<RecordImage | null>(null);
  const [viewingImageList, setViewingImageList] = useState<RecordImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadImageType, setUploadImageType] = useState("exam");
  const [uploadDescription, setUploadDescription] = useState("");

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    procedure: "",
    teeth: "",
    description: "",
    observations: "",
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: records, isLoading } = useQuery<DentalRecordWithImages[]>({
    queryKey: ["/api/records-with-images", { patientId: selectedPatientId }],
    enabled: !!selectedPatientId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      date: string;
      procedure: string;
      teeth: string;
      description: string;
      observations: string;
    }) => {
      return apiRequest("POST", "/api/records", {
        ...data,
        dentistId: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records-with-images", { patientId: selectedPatientId }] });
      toast({ title: "Registro salvo com sucesso!" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      date: string;
      procedure: string;
      teeth: string;
      description: string;
      observations: string;
    }) => {
      const { id, ...updateData } = data;
      return apiRequest("PATCH", `/api/records/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records-with-images", { patientId: selectedPatientId }] });
      toast({ title: "Registro atualizado com sucesso!" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { recordId: string; files: File[]; imageType: string; description: string }) => {
      const formData = new FormData();
      data.files.forEach((file) => formData.append("images", file));
      formData.append("imageType", data.imageType);
      formData.append("description", data.description);

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/records/${data.recordId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao fazer upload");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records-with-images", { patientId: selectedPatientId }] });
      toast({ title: "Imagens enviadas com sucesso!" });
      handleCloseUploadDialog();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao enviar imagens",
        description: error.message,
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest("DELETE", `/api/record-images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records-with-images", { patientId: selectedPatientId }] });
      toast({ title: "Imagem removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover imagem",
        description: error.message,
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      procedure: "",
      teeth: "",
      description: "",
      observations: "",
    });
  };

  const handleCloseUploadDialog = () => {
    setIsUploadDialogOpen(false);
    setUploadRecordId(null);
    setSelectedFiles([]);
    setUploadImageType("exam");
    setUploadDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEditRecord = (record: DentalRecordWithImages) => {
    setEditingRecord(record);
    setFormData({
      date: record.date,
      procedure: record.procedure,
      teeth: record.teeth || "",
      description: record.description || "",
      observations: record.observations || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenUploadDialog = (recordId: string) => {
    setUploadRecordId(recordId);
    setIsUploadDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 10) {
        toast({
          variant: "destructive",
          title: "Limite excedido",
          description: "Máximo de 10 arquivos por vez",
        });
        return;
      }
      setSelectedFiles(files);
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadRecordId || selectedFiles.length === 0) return;
    uploadMutation.mutate({
      recordId: uploadRecordId,
      files: selectedFiles,
      imageType: uploadImageType,
      description: uploadDescription,
    });
  };

  const handleViewImage = useCallback((image: RecordImage, allImages: RecordImage[]) => {
    setViewingImage(image);
    setViewingImageList(allImages);
  }, []);

  const handleNavigateImage = useCallback((direction: "prev" | "next") => {
    if (!viewingImage || viewingImageList.length === 0) return;
    const currentIndex = viewingImageList.findIndex((img) => img.id === viewingImage.id);
    let newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < viewingImageList.length) {
      setViewingImage(viewingImageList[newIndex]);
    }
  }, [viewingImage, viewingImageList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !formData.procedure) {
      toast({
        variant: "destructive",
        title: "Preencha todos os campos obrigatórios",
      });
      return;
    }

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        ...formData,
      });
    } else {
      createMutation.mutate({
        patientId: selectedPatientId,
        ...formData,
      });
    }
  };

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = searchTerm.trim();
    if (!term) return patients;
    
    return patients.filter((p) => {
      if (p.name.toLowerCase().includes(term.toLowerCase())) return true;
      if (p.recordNumber != null && String(p.recordNumber).includes(term)) return true;
      return false;
    });
  }, [patients, searchTerm]);

  const selectedPatient = patients?.find((p) => p.id === selectedPatientId);

  const groupedRecords = useMemo(() => {
    if (!records) return {};
    
    const groups: Record<string, DentalRecordWithImages[]> = {};
    records.forEach((record) => {
      const monthKey = format(parseLocalDate(record.date), "MMMM 'de' yyyy", { locale: ptBR });
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(record);
    });
    
    return groups;
  }, [records]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="h-full flex flex-col p-6 animate-fadeIn overflow-y-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Prontuário Eletrônico</h1>
          <p className="text-muted-foreground">
            Evolução clínica e documentação do paciente
          </p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          disabled={!selectedPatientId}
          data-testid="button-new-record"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Evolução
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger data-testid="select-patient">
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
                    <Input
                      placeholder="Buscar por nome ou prontuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2"
                      data-testid="input-search-patient"
                    />
                  </div>
                  {filteredPatients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">#{patient.recordNumber}</span>
                        {patient.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPatient && (
              <Button variant="outline" asChild>
                <a href={`/odontograma?patient=${selectedPatientId}`} data-testid="link-odontogram">
                  <Smile className="mr-2 h-4 w-4" />
                  Ver Odontograma
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardHeader className="py-3 border-b flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg font-heading">
            {selectedPatient
              ? `Evolução Clínica - ${selectedPatient.name}`
              : "Selecione um paciente"}
          </CardTitle>
          {selectedPatient && records && records.length > 0 && (
            <Badge variant="secondary">
              {records.length} {records.length === 1 ? "registro" : "registros"}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-auto h-[calc(100%-60px)]">
          {!selectedPatientId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Nenhum paciente selecionado</p>
              <p className="text-muted-foreground">
                Selecione um paciente para ver seu prontuário
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          ) : records && records.length > 0 ? (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-8">
                {Object.entries(groupedRecords).map(([month, monthRecords]) => (
                  <div key={month}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="font-heading font-semibold text-muted-foreground capitalize text-sm px-3">
                        {month}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />
                      <div className="space-y-4 pl-10">
                        {monthRecords.map((record, index) => (
                          <div
                            key={record.id}
                            className="relative group"
                            data-testid={`record-${record.id}`}
                          >
                            <div className="absolute -left-[26px] top-4 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                            <Card className="hover-elevate transition-all duration-200">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                                      <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">{record.procedure}</h4>
                                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(parseLocalDate(record.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {record.teeth && (
                                      <Badge variant="outline">
                                        <Smile className="mr-1 h-3 w-3" />
                                        Dente {record.teeth}
                                      </Badge>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ visibility: 'visible' }}
                                      onClick={() => handleOpenUploadDialog(record.id)}
                                      data-testid={`button-upload-image-${record.id}`}
                                    >
                                      <Camera className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ visibility: 'visible' }}
                                      onClick={() => handleEditRecord(record)}
                                      data-testid={`button-edit-record-${record.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {record.description && (
                                  <div className="mt-3 pl-13">
                                    <p className="text-sm whitespace-pre-wrap">{record.description}</p>
                                  </div>
                                )}
                                {record.observations && (
                                  <div className="mt-2 pl-13">
                                    <p className="text-sm text-muted-foreground italic">
                                      Obs: {record.observations}
                                    </p>
                                  </div>
                                )}
                                {record.images && record.images.length > 0 && (
                                  <div className="mt-3 pl-13">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Image className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground font-medium">
                                        {record.images.length} {record.images.length === 1 ? "arquivo anexo" : "arquivos anexos"}
                                      </span>
                                    </div>
                                    <ImageGallery
                                      images={record.images}
                                      onDelete={(id) => deleteImageMutation.mutate(id)}
                                      onViewImage={handleViewImage}
                                      isDeleting={deleteImageMutation.isPending}
                                    />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Nenhum registro encontrado</p>
              <p className="text-muted-foreground mb-4">
                Este paciente ainda não possui evoluções
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Evolução
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingRecord ? "Editar Evolução" : "Nova Evolução"}
            </DialogTitle>
            <DialogDescription>
              {selectedPatient && `Paciente: ${selectedPatient.name}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid="input-record-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teeth">Dente(s)</Label>
                <Input
                  id="teeth"
                  value={formData.teeth}
                  onChange={(e) => setFormData({ ...formData, teeth: e.target.value })}
                  placeholder="Ex: 11, 21, 36"
                  data-testid="input-record-teeth"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="procedure">Procedimento *</Label>
              <Select
                value={formData.procedure}
                onValueChange={(value) => setFormData({ ...formData, procedure: value })}
              >
                <SelectTrigger data-testid="select-procedure">
                  <SelectValue placeholder="Selecione o procedimento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((proc) => (
                    <SelectItem key={proc} value={proc}>
                      {proc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição / Evolução</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a evolução clínica, procedimento realizado..."
                rows={4}
                data-testid="input-record-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Observações adicionais, recomendações ao paciente..."
                rows={2}
                data-testid="input-record-observations"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-record">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingRecord ? (
                  "Atualizar Evolução"
                ) : (
                  "Salvar Evolução"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseUploadDialog();
        else setIsUploadDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Anexar Imagens/Arquivos</DialogTitle>
            <DialogDescription>
              Adicione exames, radiografias ou fotos clínicas ao registro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Arquivo</Label>
              <Select value={uploadImageType} onValueChange={setUploadImageType}>
                <SelectTrigger data-testid="select-image-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Breve descrição do arquivo..."
                data-testid="input-image-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Arquivos</Label>
              <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar arquivos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imagens (JPEG, PNG, GIF, WebP, BMP) ou PDF - Máx. 10MB cada
                  </p>
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)}KB)
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseUploadDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={uploadMutation.isPending || selectedFiles.length === 0}
              data-testid="button-upload-submit"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageViewer
        image={viewingImage}
        allImages={viewingImageList}
        onClose={() => {
          setViewingImage(null);
          setViewingImageList([]);
        }}
        onNavigate={handleNavigateImage}
      />
    </div>
  );
}
