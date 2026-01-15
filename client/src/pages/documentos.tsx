import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { FileText, Download, Printer, FileCheck, Pill, ClipboardList, AlertCircle, ChevronDown, RefreshCw, X, Plus, Stethoscope } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Patient, DentistSettings } from "@shared/schema";
import topoImage from "@assets/topo_1767890454037.png";
import footerImage from "@/assets/footer_1767891482274.png";
import fundoImage from "@assets/fundo_1768430407082.png";

function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return parseISO(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface ClinicInfo {
  phone: string;
  email: string;
  cep: string;
  address: string;
  clinicName: string;
  dentistName: string;
  cro: string;
}

interface Medication {
  name: string;
  dosage: string;
  instructions: string;
}

interface ExamItem {
  name: string;
  checked: boolean;
}

const defaultExams: ExamItem[] = [
  { name: "Hemograma completo com contagem de plaquetas", checked: true },
  { name: "Glicemia em jejum (12/12 horas)", checked: true },
  { name: "Coagulograma: Tempo de sangria; Tempo de coagulação; Tempo de Protrombina; Tempo de Tromboplastina parcial ativada", checked: true },
  { name: "Creatinina", checked: true },
  { name: "Uréia", checked: true },
  { name: "Tipagem sanguínea", checked: true },
];

const defaultRecommendations = [
  "Nas primeiras 24 horas, compressa de gelo.",
  "Proibido bochechar por três dias;",
  "Seguir corretamente o receituário;",
  "Evitar exercício físico, ex.: correr, nadar, ginástica, pegar peso.",
  "Alimentação leve (purê, sopa, carne moída, ovo, etc.), evitar sucos cítricos;",
  "Proibido levar a escova dental no local da cirurgia;",
  "Não ficar exposto ao sol;",
  "Não pesquise a área cirúrgica com a língua;",
  "Após os 3 dias de cirurgia pode fazer bochecho com antisséptico bucal;",
  "Não cuspir nas primeiras 24 horas;",
  "Retornar após 08 dias para remoção dos pontos.",
];

// Application colors - Wine/Vinho #722F37 and Burnt Rose #C08081
const PRIMARY_COLOR = { r: 114, g: 47, b: 55 };    // Wine/Vinho
const SECONDARY_COLOR = { r: 192, g: 128, b: 129 }; // Burnt Rose

// Variables to store images as base64
let topoBase64: string | null = null;
let footerBase64: string | null = null;
let fundoBase64: string | null = null;

// Generic function to load image as base64
async function loadImageAsBase64(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

// Functions to load each image
async function loadTopoAsBase64(): Promise<string> {
  if (topoBase64) return topoBase64;
  topoBase64 = await loadImageAsBase64(topoImage);
  return topoBase64;
}

async function loadFooterAsBase64(): Promise<string> {
  if (footerBase64) return footerBase64;
  footerBase64 = await loadImageAsBase64(footerImage);
  return footerBase64;
}

async function loadFundoAsBase64(): Promise<string> {
  if (fundoBase64) return fundoBase64;
  fundoBase64 = await loadImageAsBase64(fundoImage);
  return fundoBase64;
}

// Load all images at once
async function loadAllImages(): Promise<{topo: string, footer: string, fundo: string}> {
  const [topo, footer, fundo] = await Promise.all([
    loadTopoAsBase64(),
    loadFooterAsBase64(),
    loadFundoAsBase64()
  ]);
  return { topo, footer, fundo };
}

// A4 Layout constants (A4 = 210mm x 297mm)
const A4_WIDTH = 210;  // mm
const A4_HEIGHT = 297; // mm
const LEFT_MARGIN = 15;  // mm
const RIGHT_MARGIN = 15; // mm
const TOP_MARGIN = 10;   // mm
const BOTTOM_MARGIN = 10; // mm

// Header and footer heights based on image proportions
const HEADER_HEIGHT = 30; // Height of header image in mm
const FOOTER_HEIGHT = 20; // Height of footer image in mm

// Content area calculations
const CONTENT_WIDTH = A4_WIDTH - LEFT_MARGIN - RIGHT_MARGIN; // 180mm

// Create A4 configured jsPDF
function createA4PDF(): jsPDF {
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
}

function addClinicHeader(doc: jsPDF, topoData: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add header image spanning full width
  doc.addImage(topoData, "PNG", 0, 0, pageWidth, HEADER_HEIGHT);
  
  // Return Y position where content should start (below header with margin)
  return HEADER_HEIGHT + TOP_MARGIN;
}

function addClinicFooter(doc: jsPDF, footerData: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add footer image at the bottom spanning full width
  doc.addImage(footerData, "PNG", 0, pageHeight - FOOTER_HEIGHT, pageWidth, FOOTER_HEIGHT);
}

function addBackgroundWatermark(doc: jsPDF, fundoData: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Calculate size for centered watermark (about 70% of page width for A4)
  const watermarkWidth = pageWidth * 0.70;
  const watermarkHeight = watermarkWidth; // Assuming square aspect ratio for the tooth logo
  
  // Center the watermark in the content area (between header and footer)
  const contentTop = HEADER_HEIGHT;
  const contentBottom = pageHeight - FOOTER_HEIGHT;
  const contentHeight = contentBottom - contentTop;
  
  const watermarkX = (pageWidth - watermarkWidth) / 2;
  const watermarkY = contentTop + (contentHeight - watermarkHeight) / 2;
  
  // Add watermark image in the center
  doc.addImage(fundoData, "PNG", watermarkX, watermarkY, watermarkWidth, watermarkHeight);
}

function addSignatureFields(doc: jsPDF, y: number, patientName: string, dentistName: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Calculate Y position for signatures (always below content and above footer)
  const minSignatureY = y + 20;
  const maxSignatureY = pageHeight - FOOTER_HEIGHT - BOTTOM_MARGIN - 20;
  
  // Ensure signatures are always below content but don't overlap footer
  const signatureY = Math.max(minSignatureY, Math.min(y + 30, maxSignatureY));
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  // Left signature line (Patient) - positioned within margins
  const leftX = LEFT_MARGIN + 45;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(leftX - 35, signatureY, leftX + 35, signatureY);
  doc.text("Paciente", leftX, signatureY + 5, { align: "center" });
  
  // Right signature line (Dentist) - positioned within margins
  const rightX = pageWidth - RIGHT_MARGIN - 45;
  doc.line(rightX - 35, signatureY, rightX + 35, signatureY);
  doc.text("Profissional", rightX, signatureY + 5, { align: "center" });
  
  return signatureY + 15;
}

function formatDate(date: Date): string {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
}

export default function DocumentosPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [activeTab, setActiveTab] = useState("consentimento");
  
  const [dentistCro, setDentistCro] = useState("");
  
  // Texto padrão do termo de consentimento
  const defaultConsentIntro = `Eu, {NOME_PACIENTE}, brasileiro(a), portador do CPF {CPF_PACIENTE}, e RG ____________ residente e domiciliado(a) na {ENDERECO_PACIENTE}, bairro {BAIRRO_PACIENTE}, cidade {CIDADE_PACIENTE}, autorizo a Dra. MARLENE RAMALHO SIRQUEIRA ANDRADE CRO/MG nº 73648 e Dr. HANDESSA HERINGER SANTIAGO, CRO/MG nº 26514 a realizar-me o procedimento denominado extração do 3º molar INCLUSO – retirada do(s) dente(s) {DENTES_EXTRAIR}, sendo que este procedimento consiste na retirada do(s) dente(s) nº {NUMEROS_DENTES}.`;
  
  const defaultConsentProcedure = `O procedimento é feito da seguinte forma: anestesia local, incisão (corte), remoção de tecido ósseo (osso) através da utilização de broca, divisão do dente e remoção do dente. Após a remoção será realizada a limpeza da cavidade e sutura (costura).

O procedimento será realizado no consultório do dentista acima referido.

Saliento ainda que, o procedimento acima referido foi detalhado e explicado verbalmente pelo dentista de forma que entendo perfeitamente a natureza, característica, alcances e limitações do procedimento. Fui claramente informado(a) e concordei com sua realização ciente dos riscos e resultados negativos que possam ocorrer. Também o dentista me esclareceu sobre os cuidados que devo observar para evitar agravamento de meu quadro clínico, destacando:`;
  
  const defaultConsentCares = [
    "Logo após o procedimento - aplicar gelo sobre a região por quatro horas.",
    "Nas primeiras quarenta e oito (48) horas após o procedimento - Não cuspir e/ou bochechar, permanecer com a cabeça mais elevada do que o corpo, escovar os dentes regularmente, mas na região operada um cuidado maior para não ferir e não fumar.",
    "Dieta - utilizar alimentação fria e liquida nas primeiras vinte e quatro (24) horas, pastosa e liquida no segundo dia e ingerir alimentos macios até a retirada dos pontos. Não ingerir bebida alcoólica durante a recuperação.",
    "Atividade física – Não realizar esforço ou atividade física até a retirada dos pontos.",
  ];
  
  const defaultConsentWarnings = `Fui esclarecido(a) ainda antes do consentimento que:

1º. Possuo A RAIZ DO DENTE MUITO PRÓXIMA AO NERVO, que é uma situação na qual PODERÁ OCORRER UMA PARESTESIA PARCIAL OU TEMPORÁRIA, especificando que a alternativa para o tratamento é o acompanhamento da evolução do caso, ressaltando que poderá haver indicação PARA FISIOTERAPIA, em caso de evolução negativa.

2º. Mesmo com a realização deste procedimento e seguindo corretamente a orientação do dentista, o meu estado de saúde pode ser agravado. O procedimento será realizado dentro de elevados padrões técnicos de segurança e higiene, atendendo às normativas governamentais existentes. Apesar disso, o procedimento envolve risco, podendo originar diversos sintomas e efeitos adversos, tais como: dor, formigamento na face e/ou na língua, inchaço, hematomas (manchas rochas), sensibilidade, dificuldade de abertura de boca, ferida no canto da boca, aftas, alteração de hálito e outros problemas.

3º. Podem ocorrer intercorrências graves, como:
ANESTESIA – A anestesia é um recurso que representa risco, inclusive de morte, em especial: suor excessivo, aceleração do batimento cardíaco, tontura, sonolência, visão dupla ou turva, convulsões, problemas cardíacos, inclusive parada cardiorrespiratória, reações alérgicas (desde vermelhidão até um choque anafilático), náuseas, vômitos e outros sintomas referidos na bula da droga.
FRATURA DA RAIZ – Durante a retirada do dente poderá ocorrer a fratura da raiz, onde será analisada pelo profissional a viabilidade da retirada do fragmento.
DESLOCAMENTO DO DENTE PARA O INTERIOR DO SEIO MAXILAR (MASSA DO ROSTO).
PROCESSO INFLAMATÓRIO AGUDO (ALVEOLITE) – podendo este ser ocasionado, inclusive, por alimentos, por não observância dos cuidados e/ou por questões de inerentes ao estado clínico do paciente.
DANOS AOS DENTES VIZINHOS.
DORES.

4º. Motivos de força maior, intercorrências técnicas ou clínicas, pacientes com necessidade urgente e/ou outras situações também podem provocar atraso em meu atendimento.

Declaro que li e entendi as informações prestadas pelo profissional verbalmente e as acima consignadas e não possuo qualquer dúvida com relação à realização da CIRURGIA, seus riscos, intercorrências e consequências.`;
  
  const [consentData, setConsentData] = useState({
    teethToExtract: "",
    teethNumbers: "",
    hasAmoxicillinAllergy: false,
    otherAllergies: "",
    witness1Name: "",
    witness1Cpf: "",
    witness2Name: "",
    witness2Cpf: "",
    date: format(new Date(), "yyyy-MM-dd"),
    // Campos editáveis do termo
    introText: defaultConsentIntro,
    procedureText: defaultConsentProcedure,
    cares: [...defaultConsentCares],
    warningsText: defaultConsentWarnings,
    showWarnings: true,
  });
  
  const [examData, setExamData] = useState({
    material: "Sangue",
    exams: [...defaultExams],
    date: format(new Date(), "yyyy-MM-dd"),
  });
  
  const [prescriptionData, setPrescriptionData] = useState({
    medications: [
      { name: "Amoxicilina 500mg", dosage: "21 comps.", instructions: "Tomar 01 comp. de 8/8 horas por 7 dias." },
      { name: "Nimesulida 100 mg", dosage: "1 cx", instructions: "Tomar 01 comp. de 8/8 horas por 5 dias" },
      { name: "Dipirona 500 mg", dosage: "1 frasco", instructions: "Tomar 40 gotas de 4/4 horas por 03 dias." },
    ] as Medication[],
    date: format(new Date(), "yyyy-MM-dd"),
  });
  
  const [recommendationsData, setRecommendationsData] = useState({
    recommendations: [...defaultRecommendations],
    date: format(new Date(), "yyyy-MM-dd"),
  });
  
  const [atestadoData, setAtestadoData] = useState({
    rg: "",
    horaInicio: "",
    horaFim: "",
    diasConvalescenca: "",
    diasPorExtenso: "",
    cid: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const [patientSearchTerm, setPatientSearchTerm] = useState("");

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = patientSearchTerm.trim();
    if (!term) return patients;
    
    return patients.filter((p) => {
      // Search by name (case insensitive)
      if (p.name.toLowerCase().includes(term.toLowerCase())) return true;
      // Search by record number
      if (p.recordNumber != null && String(p.recordNumber).includes(term)) return true;
      return false;
    });
  }, [patients, patientSearchTerm]);
  
  const { data: settings } = useQuery<DentistSettings>({
    queryKey: ["/api/settings"],
  });
  
  const selectedPatient = patients?.find((p) => p.id === selectedPatientId);
  
  const getClinicInfo = (): ClinicInfo => ({
    phone: settings?.clinicPhone || "",
    email: settings?.clinicEmail || "",
    cep: settings?.clinicCep || "",
    address: settings?.clinicAddress || "",
    clinicName: settings?.clinicName || "Odonto Clínica",
    dentistName: user?.name || "Dentista",
    cro: dentistCro,
  });
  
  const validateBeforeGenerate = (): boolean => {
    if (!selectedPatient) {
      toast({ variant: "destructive", title: "Selecione um paciente" });
      return false;
    }
    if (!dentistCro.trim()) {
      toast({ variant: "destructive", title: "Informe o CRO do dentista" });
      return false;
    }
    return true;
  };
  
  const generateConsentPDF = async () => {
    if (!validateBeforeGenerate() || !selectedPatient) return;
    
    const patient = selectedPatient;
    const images = await loadAllImages();
    const doc = createA4PDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Função para adicionar nova página se necessário
    const checkPageBreak = (currentY: number, neededSpace: number): number => {
      if (currentY + neededSpace > pageHeight - FOOTER_HEIGHT - 20) {
        doc.addPage();
        addBackgroundWatermark(doc, images.fundo);
        addClinicHeader(doc, images.topo);
        return TOP_MARGIN + HEADER_HEIGHT + 5;
      }
      return currentY;
    };
    
    // Add background watermark first (behind everything)
    addBackgroundWatermark(doc, images.fundo);
    
    // Add header image
    let y = addClinicHeader(doc, images.topo);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.text("TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO PARA", pageWidth / 2, y, { align: "center" });
    y += 4;
    doc.text("PEQUENAS CIRURGIAS ODONTOLÓGICAS – RETIRADA DE DENTE(S)", pageWidth / 2, y, { align: "center" });
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    
    // Substituir placeholders no texto de introdução (usando replaceAll para múltiplas ocorrências)
    let introText = consentData.introText
      .replaceAll("{NOME_PACIENTE}", patient.name)
      .replaceAll("{CPF_PACIENTE}", patient.cpf || "_______________")
      .replaceAll("{ENDERECO_PACIENTE}", patient.address || "_______________")
      .replaceAll("{BAIRRO_PACIENTE}", patient.city || "_______________")
      .replaceAll("{CIDADE_PACIENTE}", patient.city || "_______________")
      .replaceAll("{DENTES_EXTRAIR}", consentData.teethToExtract || "_______________")
      .replaceAll("{NUMEROS_DENTES}", consentData.teethNumbers || "_______________");
    
    const introLines = doc.splitTextToSize(introText, CONTENT_WIDTH);
    y = checkPageBreak(y, introLines.length * 3.5);
    doc.text(introLines, LEFT_MARGIN, y);
    y += introLines.length * 3.5 + 4;
    
    // Texto do procedimento (editável)
    const procedureLines = doc.splitTextToSize(consentData.procedureText, CONTENT_WIDTH);
    y = checkPageBreak(y, procedureLines.length * 3.5);
    doc.text(procedureLines, LEFT_MARGIN, y);
    y += procedureLines.length * 3.5 + 4;
    
    // Cuidados (editáveis) - filtra entradas vazias
    consentData.cares.filter(care => care.trim()).forEach((care) => {
      const careItemLines = doc.splitTextToSize(`• ${care}`, CONTENT_WIDTH - 5);
      y = checkPageBreak(y, careItemLines.length * 3.5 + 2);
      doc.text(careItemLines, LEFT_MARGIN + 3, y);
      y += careItemLines.length * 3.5 + 2;
    });
    
    y += 3;
    
    // Avisos e riscos (editável, opcional)
    if (consentData.showWarnings && consentData.warningsText) {
      const warningLines = doc.splitTextToSize(consentData.warningsText, CONTENT_WIDTH);
      y = checkPageBreak(y, warningLines.length * 3.5);
      doc.text(warningLines, LEFT_MARGIN, y);
      y += warningLines.length * 3.5 + 4;
    }
    
    // Declaração de alergia
    const allergyText = consentData.hasAmoxicillinAllergy 
      ? `POR FIM, DECLARO AINDA SER INTOLERANTE A AMOXICILINA${consentData.otherAllergies ? `, E A ${consentData.otherAllergies}` : ", E A NENHUM OUTRO MEDICAMENTO"}.`
      : `POR FIM, DECLARO NÃO SER INTOLERANTE A NENHUM MEDICAMENTO${consentData.otherAllergies ? `, EXCETO ${consentData.otherAllergies}` : ""}.`;
    
    y = checkPageBreak(y, 15);
    doc.setFont("helvetica", "bold");
    const allergyLines = doc.splitTextToSize(allergyText, CONTENT_WIDTH);
    doc.text(allergyLines, LEFT_MARGIN, y);
    y += allergyLines.length * 3.5 + 6;
    
    doc.setFont("helvetica", "normal");
    y = checkPageBreak(y, 25);
    doc.text(`PACIENTE: ${patient.name}`, LEFT_MARGIN, y);
    y += 4;
    doc.text(`CPF: ${patient.cpf || "_______________"}`, LEFT_MARGIN, y);
    y += 6;
    
    doc.text("TESTEMUNHA PRESENTE NO ATO DA EXPLICAÇÃO E DA CIRURGIA:", LEFT_MARGIN, y);
    y += 4;
    doc.text(`${consentData.witness1Name || "_______________________________________"} CPF ${consentData.witness1Cpf || "_______________"}`, LEFT_MARGIN, y);
    y += 4;
    doc.text(`${consentData.witness2Name || "_______________________________________"} CPF ${consentData.witness2Cpf || "_______________"}`, LEFT_MARGIN, y);
    y += 8;
    
    const dateStr = format(parseLocalDate(consentData.date), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase();
    doc.text(`TEÓFILO OTONI, ${dateStr}.`, pageWidth / 2, y, { align: "center" });
    
    // Add signature fields above footer
    addSignatureFields(doc, y, patient.name, user?.name || "Dentista");
    
    // Add footer image
    addClinicFooter(doc, images.footer);
    
    doc.save(`termo_consentimento_${patient.name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };
  
  const generateExamRequestPDF = async () => {
    if (!validateBeforeGenerate() || !selectedPatient) return;
    
    const patient = selectedPatient;
    const clinicInfo = getClinicInfo();
    const images = await loadAllImages();
    const doc = createA4PDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add background watermark first
    addBackgroundWatermark(doc, images.fundo);
    
    // Add header image
    let y = addClinicHeader(doc, images.topo);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.text("SOLICITAÇÃO DE EXAMES", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    doc.setFont("helvetica", "bold");
    doc.text("NOME:", LEFT_MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(patient.name, LEFT_MARGIN + 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.text("MATERIAL À EXAMINAR:", LEFT_MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(examData.material, LEFT_MARGIN + 50, y);
    y += 12;
    
    doc.setFont("helvetica", "bold");
    doc.text("PEDIDOS:", LEFT_MARGIN, y);
    y += 7;
    
    doc.setFont("helvetica", "normal");
    examData.exams.forEach((exam) => {
      if (exam.checked) {
        const examLines = doc.splitTextToSize(`• ${exam.name};`, CONTENT_WIDTH - 10);
        doc.text(examLines, LEFT_MARGIN + 5, y);
        y += examLines.length * 4.5 + 2;
      }
    });
    
    y += 15;
    const dateStr = format(parseLocalDate(examData.date), "dd/MM/yyyy");
    doc.text(`${dateStr}`, pageWidth / 2, y, { align: "center" });
    
    // Add signature fields above footer
    addSignatureFields(doc, y, patient.name, clinicInfo.dentistName);
    
    // Add footer image
    addClinicFooter(doc, images.footer);
    
    doc.save(`solicitacao_exames_${patient.name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };
  
  const generatePrescriptionPDF = async () => {
    if (!validateBeforeGenerate() || !selectedPatient) return;
    
    const patient = selectedPatient;
    const clinicInfo = getClinicInfo();
    const images = await loadAllImages();
    const doc = createA4PDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add background watermark first
    addBackgroundWatermark(doc, images.fundo);
    
    // Add header image
    let y = addClinicHeader(doc, images.topo);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.text("RECEITUÁRIO", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("NOME:", LEFT_MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(patient.name, LEFT_MARGIN + 20, y);
    y += 7;
    
    if (patient.address) {
      doc.setFont("helvetica", "bold");
      doc.text("ENDEREÇO:", LEFT_MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.text(patient.address, LEFT_MARGIN + 30, y);
      y += 7;
    }
    
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("USO ORAL:", LEFT_MARGIN, y);
    y += 7;
    
    doc.setFont("helvetica", "normal");
    prescriptionData.medications.forEach((med, index) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${med.name}`, LEFT_MARGIN, y);
      doc.setFont("helvetica", "normal");
      const dottedLine = "_".repeat(25);
      doc.text(`${dottedLine} ${med.dosage}`, LEFT_MARGIN + 55, y);
      y += 5;
      
      const instructionLines = doc.splitTextToSize(med.instructions, CONTENT_WIDTH - 10);
      doc.text(instructionLines, LEFT_MARGIN + 5, y);
      y += instructionLines.length * 4.5 + 6;
    });
    
    y += 15;
    const dateStr = format(parseLocalDate(prescriptionData.date), "dd/MM/yyyy");
    doc.text(`${dateStr}`, pageWidth / 2, y, { align: "center" });
    
    // Add signature fields above footer
    addSignatureFields(doc, y, patient.name, clinicInfo.dentistName);
    
    // Add footer image
    addClinicFooter(doc, images.footer);
    
    doc.save(`receituario_${patient.name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };
  
  const generateRecommendationsPDF = async () => {
    if (!validateBeforeGenerate() || !selectedPatient) return;
    
    const patient = selectedPatient;
    const clinicInfo = getClinicInfo();
    const images = await loadAllImages();
    const doc = createA4PDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add background watermark first
    addBackgroundWatermark(doc, images.fundo);
    
    // Add header image
    let y = addClinicHeader(doc, images.topo);
    
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.text("RECOMENDAÇÕES", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("PACIENTE:", LEFT_MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(patient.name, LEFT_MARGIN + 30, y);
    y += 12;
    
    doc.setFont("helvetica", "normal");
    recommendationsData.recommendations.forEach((rec, index) => {
      const recLines = doc.splitTextToSize(`${index + 1}. ${rec}`, CONTENT_WIDTH - 5);
      doc.text(recLines, LEFT_MARGIN, y);
      y += recLines.length * 4.5 + 3;
    });
    
    y += 15;
    const dateStr = format(parseLocalDate(recommendationsData.date), "dd/MM/yyyy");
    doc.text(`${dateStr}`, pageWidth / 2, y, { align: "center" });
    
    // Add signature fields above footer
    addSignatureFields(doc, y, patient.name, clinicInfo.dentistName);
    
    // Add footer image
    addClinicFooter(doc, images.footer);
    
    doc.save(`recomendacoes_${patient.name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };
  
  const generateAtestadoPDF = async () => {
    if (!validateBeforeGenerate() || !selectedPatient) return;
    
    const patient = selectedPatient;
    const clinicInfo = getClinicInfo();
    const images = await loadAllImages();
    const doc = createA4PDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add background watermark first
    addBackgroundWatermark(doc, images.fundo);
    
    // Add header image
    let y = addClinicHeader(doc, images.topo);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
    doc.text("ATESTADO", pageWidth / 2, y, { align: "center" });
    y += 15;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    // Format date for display
    const [year, month, day] = atestadoData.date.split('-');
    
    // Build the atestado text
    doc.text("Atesto para os devidos fins, que o (a)", LEFT_MARGIN, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Sr (a) ${patient.name}`, LEFT_MARGIN, y);
    doc.setFont("helvetica", "normal");
    y += 8;
    
    doc.text(`Portador do RG: ${atestadoData.rg || "___________________________"}`, LEFT_MARGIN, y);
    y += 8;
    
    doc.text(`Residente à: ${patient.address || "___________________________"}`, LEFT_MARGIN, y);
    y += 8;
    
    const horaInicio = atestadoData.horaInicio || "____";
    const horaFim = atestadoData.horaFim || "____";
    doc.text(`esteve sob meus cuidados profissionais no período das ${horaInicio} às ${horaFim} horas`, LEFT_MARGIN, y);
    y += 8;
    
    doc.text(`do dia ${day || "___"}/${month || "___"}/${year || "___"}.`, LEFT_MARGIN, y);
    y += 8;
    
    const diasNum = atestadoData.diasConvalescenca || "___";
    const diasExtenso = atestadoData.diasPorExtenso || "________________";
    doc.text(`Necessitando o (a) de ${diasNum} (${diasExtenso}) dia/s de`, LEFT_MARGIN, y);
    y += 8;
    
    const cid = atestadoData.cid || "________________";
    doc.text(`convalescença. CID: ${cid}.`, LEFT_MARGIN, y);
    y += 25;
    
    // Date
    const dateStr = format(parseLocalDate(atestadoData.date), "dd/MM/yyyy");
    doc.text(`${dateStr}`, pageWidth / 2, y, { align: "center" });
    
    // Add signature fields above footer (only dentist signature for atestado)
    const pageHeight = doc.internal.pageSize.getHeight();
    const signatureY = Math.max(y + 20, Math.min(y + 30, pageHeight - FOOTER_HEIGHT - BOTTOM_MARGIN - 20));
    
    doc.setFontSize(10);
    const centerX = pageWidth / 2;
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.line(centerX - 40, signatureY, centerX + 40, signatureY);
    doc.text("Profissional", centerX, signatureY + 5, { align: "center" });
    doc.setFontSize(9);
    doc.text(`CRO: ${clinicInfo.cro}`, centerX, signatureY + 10, { align: "center" });
    
    // Add footer image
    addClinicFooter(doc, images.footer);
    
    doc.save(`atestado_${patient.name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };
  
  const addMedication = () => {
    setPrescriptionData({
      ...prescriptionData,
      medications: [...prescriptionData.medications, { name: "", dosage: "", instructions: "" }],
    });
  };
  
  const removeMedication = (index: number) => {
    setPrescriptionData({
      ...prescriptionData,
      medications: prescriptionData.medications.filter((_, i) => i !== index),
    });
  };
  
  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...prescriptionData.medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setPrescriptionData({ ...prescriptionData, medications: newMeds });
  };
  
  const toggleExam = (index: number) => {
    const newExams = [...examData.exams];
    newExams[index] = { ...newExams[index], checked: !newExams[index].checked };
    setExamData({ ...examData, exams: newExams });
  };
  
  const addRecommendation = () => {
    setRecommendationsData({
      ...recommendationsData,
      recommendations: [...recommendationsData.recommendations, ""],
    });
  };
  
  const removeRecommendation = (index: number) => {
    setRecommendationsData({
      ...recommendationsData,
      recommendations: recommendationsData.recommendations.filter((_, i) => i !== index),
    });
  };
  
  const updateRecommendation = (index: number, value: string) => {
    const newRecs = [...recommendationsData.recommendations];
    newRecs[index] = value;
    setRecommendationsData({ ...recommendationsData, recommendations: newRecs });
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fadeIn overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Documentos</h1>
        <p className="text-muted-foreground">Gere formulários e documentos em PDF para seus pacientes</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Informações do Documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientSelect">Paciente</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger data-testid="select-patient">
                  <SelectValue placeholder="Selecione um paciente..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
                    <Input
                      placeholder="Buscar por nome ou prontuário..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="mb-2"
                      data-testid="input-search-patient"
                    />
                  </div>
                  {filteredPatients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">#{patient.recordNumber}</span>
                        {patient.name} {patient.cpf ? `- CPF: ${patient.cpf}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dentistCro">CRO do Dentista</Label>
              <Input
                id="dentistCro"
                placeholder="Ex: CRO-MG 12345"
                value={dentistCro}
                onChange={(e) => setDentistCro(e.target.value)}
                data-testid="input-dentist-cro"
              />
            </div>
          </div>
          
          {selectedPatient && (
            <div className="p-4 bg-muted/50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {selectedPatient.name}
                </div>
                <div>
                  <span className="font-medium">CPF:</span> {selectedPatient.cpf || "Não informado"}
                </div>
                <div>
                  <span className="font-medium">Telefone:</span> {selectedPatient.phone || "Não informado"}
                </div>
                <div className="md:col-span-3">
                  <span className="font-medium">Endereço:</span> {selectedPatient.address || "Não informado"}
                  {selectedPatient.city && `, ${selectedPatient.city}`}
                  {selectedPatient.state && ` - ${selectedPatient.state}`}
                </div>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-muted/50 rounded-md">
            <h4 className="font-medium text-sm mb-3">Dados que aparecerão no documento:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Clínica:</span> {settings?.clinicName || "Não configurado"}
              </div>
              <div>
                <span className="font-medium">Dentista:</span> {user?.name || "Não identificado"}
              </div>
              <div>
                <span className="font-medium">Telefone:</span> {settings?.clinicPhone || "Não configurado"}
              </div>
              <div>
                <span className="font-medium">Email:</span> {settings?.clinicEmail || "Não configurado"}
              </div>
              <div>
                <span className="font-medium">CRO:</span> {dentistCro || "Não informado"}
              </div>
              <div>
                <span className="font-medium">CEP:</span> {settings?.clinicCep || "Não configurado"}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Endereço:</span> {settings?.clinicAddress || "Não configurado"}
              </div>
            </div>
            {(!settings?.clinicName || !settings?.clinicAddress) && (
              <p className="text-sm text-warning mt-3">
                Configure os dados da clínica em Configurações para que apareçam corretamente nos documentos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="consentimento" data-testid="tab-consentimento" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Termo de Consentimento</span>
            <span className="sm:hidden">Termo</span>
          </TabsTrigger>
          <TabsTrigger value="exames" data-testid="tab-exames" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Solicitação de Exames</span>
            <span className="sm:hidden">Exames</span>
          </TabsTrigger>
          <TabsTrigger value="receituario" data-testid="tab-receituario" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            <span className="hidden sm:inline">Receituário</span>
            <span className="sm:hidden">Receita</span>
          </TabsTrigger>
          <TabsTrigger value="recomendacoes" data-testid="tab-recomendacoes" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Recomendações</span>
            <span className="sm:hidden">Rec.</span>
          </TabsTrigger>
          <TabsTrigger value="atestado" data-testid="tab-atestado" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Atestado</span>
            <span className="sm:hidden">Atest.</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="consentimento">
          <Card>
            <CardHeader>
              <CardTitle>Termo de Consentimento para Cirurgia</CardTitle>
              <CardDescription>
                Preencha os dados para gerar o termo de consentimento livre e esclarecido para pequenas cirurgias odontológicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teethToExtract">Dente(s) a extrair (descrição)</Label>
                  <Input
                    id="teethToExtract"
                    placeholder="Ex: 3º molar inferior esquerdo"
                    value={consentData.teethToExtract}
                    onChange={(e) => setConsentData({ ...consentData, teethToExtract: e.target.value })}
                    data-testid="input-teeth-extract"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teethNumbers">Número(s) do(s) dente(s)</Label>
                  <Input
                    id="teethNumbers"
                    placeholder="Ex: 38, 48"
                    value={consentData.teethNumbers}
                    onChange={(e) => setConsentData({ ...consentData, teethNumbers: e.target.value })}
                    data-testid="input-teeth-numbers"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasAmoxicillinAllergy"
                    checked={consentData.hasAmoxicillinAllergy}
                    onCheckedChange={(checked) => setConsentData({ ...consentData, hasAmoxicillinAllergy: checked as boolean })}
                    data-testid="checkbox-amoxicillin-allergy"
                  />
                  <Label htmlFor="hasAmoxicillinAllergy">Paciente é intolerante a Amoxicilina</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherAllergies">Outras alergias/intolerâncias</Label>
                  <Input
                    id="otherAllergies"
                    placeholder="Ex: Dipirona, Anti-inflamatórios"
                    value={consentData.otherAllergies}
                    onChange={(e) => setConsentData({ ...consentData, otherAllergies: e.target.value })}
                    data-testid="input-other-allergies"
                  />
                </div>
              </div>
              
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="button-edit-consent-text">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Editar Texto do Termo
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="introText">Texto de Introdução</Label>
                    <p className="text-xs text-muted-foreground">
                      Use os marcadores: {"{NOME_PACIENTE}"}, {"{CPF_PACIENTE}"}, {"{ENDERECO_PACIENTE}"}, {"{BAIRRO_PACIENTE}"}, {"{CIDADE_PACIENTE}"}, {"{DENTES_EXTRAIR}"}, {"{NUMEROS_DENTES}"}
                    </p>
                    <Textarea
                      id="introText"
                      value={consentData.introText}
                      onChange={(e) => setConsentData({ ...consentData, introText: e.target.value })}
                      rows={6}
                      data-testid="textarea-intro-text"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="procedureText">Texto do Procedimento</Label>
                    <Textarea
                      id="procedureText"
                      value={consentData.procedureText}
                      onChange={(e) => setConsentData({ ...consentData, procedureText: e.target.value })}
                      rows={8}
                      data-testid="textarea-procedure-text"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Cuidados Pós-Operatórios</Label>
                    {consentData.cares.map((care, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={care}
                          onChange={(e) => {
                            const newCares = [...consentData.cares];
                            newCares[index] = e.target.value;
                            setConsentData({ ...consentData, cares: newCares });
                          }}
                          rows={2}
                          className="flex-1"
                          data-testid={`textarea-care-${index}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newCares = consentData.cares.filter((_, i) => i !== index);
                            setConsentData({ ...consentData, cares: newCares });
                          }}
                          data-testid={`button-remove-care-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConsentData({ ...consentData, cares: [...consentData.cares, ""] })}
                      data-testid="button-add-care"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Cuidado
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="warningsText">Avisos e Riscos</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showWarnings"
                          checked={consentData.showWarnings}
                          onCheckedChange={(checked) => setConsentData({ ...consentData, showWarnings: checked as boolean })}
                          data-testid="checkbox-show-warnings"
                        />
                        <Label htmlFor="showWarnings" className="text-sm">Incluir no PDF</Label>
                      </div>
                    </div>
                    <Textarea
                      id="warningsText"
                      value={consentData.warningsText}
                      onChange={(e) => setConsentData({ ...consentData, warningsText: e.target.value })}
                      rows={10}
                      disabled={!consentData.showWarnings}
                      data-testid="textarea-warnings-text"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setConsentData({
                      ...consentData,
                      introText: defaultConsentIntro,
                      procedureText: defaultConsentProcedure,
                      cares: [...defaultConsentCares],
                      warningsText: defaultConsentWarnings,
                    })}
                    data-testid="button-reset-consent-text"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restaurar Texto Padrão
                  </Button>
                </CollapsibleContent>
              </Collapsible>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Testemunhas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="witness1Name">Nome da Testemunha 1</Label>
                    <Input
                      id="witness1Name"
                      value={consentData.witness1Name}
                      onChange={(e) => setConsentData({ ...consentData, witness1Name: e.target.value })}
                      data-testid="input-witness1-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="witness1Cpf">CPF da Testemunha 1</Label>
                    <Input
                      id="witness1Cpf"
                      value={consentData.witness1Cpf}
                      onChange={(e) => setConsentData({ ...consentData, witness1Cpf: e.target.value })}
                      data-testid="input-witness1-cpf"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="witness2Name">Nome da Testemunha 2</Label>
                    <Input
                      id="witness2Name"
                      value={consentData.witness2Name}
                      onChange={(e) => setConsentData({ ...consentData, witness2Name: e.target.value })}
                      data-testid="input-witness2-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="witness2Cpf">CPF da Testemunha 2</Label>
                    <Input
                      id="witness2Cpf"
                      value={consentData.witness2Cpf}
                      onChange={(e) => setConsentData({ ...consentData, witness2Cpf: e.target.value })}
                      data-testid="input-witness2-cpf"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="consentDate">Data do documento</Label>
                <Input
                  id="consentDate"
                  type="date"
                  value={consentData.date}
                  onChange={(e) => setConsentData({ ...consentData, date: e.target.value })}
                  data-testid="input-consent-date"
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <Button onClick={generateConsentPDF} disabled={!selectedPatient} data-testid="button-generate-consent">
                  <Download className="h-4 w-4 mr-2" />
                  Gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="exames">
          <Card>
            <CardHeader>
              <CardTitle>Solicitação de Exames</CardTitle>
              <CardDescription>
                Selecione os exames a serem solicitados para o paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="material">Material a Examinar</Label>
                <Input
                  id="material"
                  value={examData.material}
                  onChange={(e) => setExamData({ ...examData, material: e.target.value })}
                  data-testid="input-exam-material"
                />
              </div>
              
              <div className="space-y-3">
                <Label>Exames Solicitados</Label>
                {examData.exams.map((exam, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Checkbox
                      id={`exam-${index}`}
                      checked={exam.checked}
                      onCheckedChange={() => toggleExam(index)}
                      data-testid={`checkbox-exam-${index}`}
                    />
                    <Label htmlFor={`exam-${index}`} className="text-sm font-normal cursor-pointer">
                      {exam.name}
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="examDate">Data da solicitação</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={examData.date}
                  onChange={(e) => setExamData({ ...examData, date: e.target.value })}
                  data-testid="input-exam-date"
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <Button onClick={generateExamRequestPDF} disabled={!selectedPatient} data-testid="button-generate-exams">
                  <Download className="h-4 w-4 mr-2" />
                  Gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="receituario">
          <Card>
            <CardHeader>
              <CardTitle>Receituário</CardTitle>
              <CardDescription>
                Adicione as medicações a serem prescritas para o paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {prescriptionData.medications.map((med, index) => (
                  <div key={index} className="p-4 border rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Medicação {index + 1}</Label>
                      {prescriptionData.medications.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedication(index)}
                          data-testid={`button-remove-med-${index}`}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`med-name-${index}`}>Nome do medicamento</Label>
                        <Input
                          id={`med-name-${index}`}
                          placeholder="Ex: Amoxicilina 500mg"
                          value={med.name}
                          onChange={(e) => updateMedication(index, "name", e.target.value)}
                          data-testid={`input-med-name-${index}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`med-dosage-${index}`}>Quantidade</Label>
                        <Input
                          id={`med-dosage-${index}`}
                          placeholder="Ex: 21 comps."
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          data-testid={`input-med-dosage-${index}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`med-instructions-${index}`}>Posologia</Label>
                      <Textarea
                        id={`med-instructions-${index}`}
                        placeholder="Ex: Tomar 01 comp. de 8/8 horas por 7 dias."
                        value={med.instructions}
                        onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                        data-testid={`input-med-instructions-${index}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="outline" onClick={addMedication} data-testid="button-add-medication">
                Adicionar Medicação
              </Button>
              
              <div className="space-y-2">
                <Label htmlFor="prescriptionDate">Data da receita</Label>
                <Input
                  id="prescriptionDate"
                  type="date"
                  value={prescriptionData.date}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, date: e.target.value })}
                  data-testid="input-prescription-date"
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <Button onClick={generatePrescriptionPDF} disabled={!selectedPatient} data-testid="button-generate-prescription">
                  <Download className="h-4 w-4 mr-2" />
                  Gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recomendacoes">
          <Card>
            <CardHeader>
              <CardTitle>Recomendações Pós-Operatórias</CardTitle>
              <CardDescription>
                Personalize as recomendações pós-cirúrgicas para o paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {recommendationsData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-sm font-medium mt-2 w-6">{index + 1}.</span>
                    <div className="flex-1">
                      <Textarea
                        value={rec}
                        onChange={(e) => updateRecommendation(index, e.target.value)}
                        className="min-h-[60px]"
                        data-testid={`input-recommendation-${index}`}
                      />
                    </div>
                    {recommendationsData.recommendations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecommendation(index)}
                        data-testid={`button-remove-rec-${index}`}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <Button variant="outline" onClick={addRecommendation} data-testid="button-add-recommendation">
                Adicionar Recomendação
              </Button>
              
              <div className="space-y-2">
                <Label htmlFor="recommendationsDate">Data do documento</Label>
                <Input
                  id="recommendationsDate"
                  type="date"
                  value={recommendationsData.date}
                  onChange={(e) => setRecommendationsData({ ...recommendationsData, date: e.target.value })}
                  data-testid="input-recommendations-date"
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <Button onClick={generateRecommendationsPDF} disabled={!selectedPatient} data-testid="button-generate-recommendations">
                  <Download className="h-4 w-4 mr-2" />
                  Gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="atestado">
          <Card>
            <CardHeader>
              <CardTitle>Atestado Odontológico</CardTitle>
              <CardDescription>
                Gere um atestado para o paciente com informações sobre o atendimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rg">RG do Paciente</Label>
                  <Input
                    id="rg"
                    placeholder="Ex: MG-12.345.678"
                    value={atestadoData.rg}
                    onChange={(e) => setAtestadoData({ ...atestadoData, rg: e.target.value })}
                    data-testid="input-rg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="atestadoDate">Data do Atendimento</Label>
                  <Input
                    id="atestadoDate"
                    type="date"
                    value={atestadoData.date}
                    onChange={(e) => setAtestadoData({ ...atestadoData, date: e.target.value })}
                    data-testid="input-atestado-date"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horaInicio">Hora de Início do Atendimento</Label>
                  <Input
                    id="horaInicio"
                    type="time"
                    value={atestadoData.horaInicio}
                    onChange={(e) => setAtestadoData({ ...atestadoData, horaInicio: e.target.value })}
                    data-testid="input-hora-inicio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaFim">Hora de Término do Atendimento</Label>
                  <Input
                    id="horaFim"
                    type="time"
                    value={atestadoData.horaFim}
                    onChange={(e) => setAtestadoData({ ...atestadoData, horaFim: e.target.value })}
                    data-testid="input-hora-fim"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diasConvalescenca">Dias de Convalescença (número)</Label>
                  <Input
                    id="diasConvalescenca"
                    type="number"
                    min="0"
                    placeholder="Ex: 3"
                    value={atestadoData.diasConvalescenca}
                    onChange={(e) => setAtestadoData({ ...atestadoData, diasConvalescenca: e.target.value })}
                    data-testid="input-dias-convalescenca"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diasPorExtenso">Dias por Extenso</Label>
                  <Input
                    id="diasPorExtenso"
                    placeholder="Ex: três"
                    value={atestadoData.diasPorExtenso}
                    onChange={(e) => setAtestadoData({ ...atestadoData, diasPorExtenso: e.target.value })}
                    data-testid="input-dias-extenso"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cid">CID (opcional)</Label>
                  <Input
                    id="cid"
                    placeholder="Ex: K00.0"
                    value={atestadoData.cid}
                    onChange={(e) => setAtestadoData({ ...atestadoData, cid: e.target.value })}
                    data-testid="input-cid"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <Button onClick={generateAtestadoPDF} disabled={!selectedPatient} data-testid="button-generate-atestado">
                  <Download className="h-4 w-4 mr-2" />
                  Gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
