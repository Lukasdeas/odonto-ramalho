interface WhatsAppNotificationData {
  patientName: string;
  patientPhone: string;
  treatmentName: string;
  dentistName?: string;
  preferredDate?: string;
}

interface NotificationTarget {
  phone: string;
  name: string;
}

export async function sendWhatsAppNotification(
  data: WhatsAppNotificationData,
  clinicWhatsApp: string | null,
  dentistPhone?: string | null
): Promise<{ success: boolean; patientMessage?: string; clinicMessage?: string }> {
  const result = {
    success: false,
    patientMessage: "",
    clinicMessage: "",
  };

  const patientMessage = `Olá ${data.patientName}! Recebemos sua solicitação de agendamento para "${data.treatmentName}". Estaremos avaliando nossa agenda e retornaremos em breve com data e horário disponíveis. Obrigado por escolher a Odonto Ramalho!`;
  
  const clinicMessage = `Nova solicitação de agendamento:\n\nPaciente: ${data.patientName}\nTelefone: ${data.patientPhone}\nTratamento: ${data.treatmentName}${data.dentistName ? `\nDentista: ${data.dentistName}` : " (Clínica)"}${data.preferredDate ? `\nData preferida: ${data.preferredDate}` : ""}`;

  result.patientMessage = patientMessage;
  result.clinicMessage = clinicMessage;

  const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!WHATSAPP_PHONE_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.log("WhatsApp credentials not configured. Messages would be:");
    console.log("To patient:", patientMessage);
    console.log("To clinic:", clinicMessage);
    result.success = true;
    return result;
  }

  try {
    const formatPhone = (phone: string): string => {
      const digits = phone.replace(/\D/g, "");
      if (digits.startsWith("55")) return digits;
      return `55${digits}`;
    };

    const sendMessage = async (to: string, text: string) => {
      const formattedPhone = formatPhone(to);
      console.log(`Sending WhatsApp message to: ${formattedPhone}`);
      
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: text },
          }),
        }
      );

      const responseData = await response.text();
      
      if (!response.ok) {
        console.error(`WhatsApp API error: ${responseData}`);
        return false;
      }
      
      console.log(`WhatsApp message sent successfully: ${responseData}`);
      return true;
    };

    const patientSent = await sendMessage(data.patientPhone, patientMessage);

    const clinicTargetPhone = dentistPhone || clinicWhatsApp;
    if (clinicTargetPhone) {
      await sendMessage(clinicTargetPhone, clinicMessage);
    }

    result.success = patientSent;
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    result.success = false;
  }

  return result;
}
