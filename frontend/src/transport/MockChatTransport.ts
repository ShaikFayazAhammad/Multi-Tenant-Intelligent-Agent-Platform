import { ChatTransport } from "./ChatTransport"
import { ChatEvent } from "../types/chat"

const QNA_DATABASE: Record<string, string> = {
  availability: "Ground Floor and 2nd Floor meeting rooms have open slots today. I can help book one if you share the time.",
  booking: "I can create room bookings, pantry requests, or support tickets. Tell me the room, date, and time.",
  "room booking": "I can help with a room booking. Share the room name, date, and time window.",
  "my bookings": "You currently have one demo booking saved for today and can ask me to create more.",
  "tea": "Tea service can be raised for your current room. I can also include sugar, milk, and delivery time.",
  coffee: "Coffee service can be raised for your current room. I can include quantity and delivery window.",
  pantry: "Pantry requests are supported. You can ask for tea, coffee, snacks, or custom items.",
  banking: "Banking FAQs and policy guidance are available through the RAG service.",
  policy: "I can answer banking and workplace policy questions from the knowledge base.",
  support: "Facilities, housekeeping, IT, and pantry support are all handled in this experience.",
  hello: "Hello! I’m Hexa, your assistant for banking info, VMS bookings, and service requests.",
  hi: "Hi! I’m Hexa. Ask me about rooms, banking info, tea, coffee, or support requests.",
}

const DEFAULT_RESPONSE =
  "I can help with banking FAQs, room booking, tea or coffee requests, and support actions. Try asking for availability, a booking, or a pantry request."

export class MockChatTransport implements ChatTransport {
  private callback?: (event: ChatEvent) => void
  private currentInterval?: NodeJS.Timeout

  connect() {
    console.log("Mock transport connected")
  }

  disconnect() {
    if (this.currentInterval) {
      clearInterval(this.currentInterval)
      this.currentInterval = undefined
    }
  }

  onEvent(cb: (event: ChatEvent) => void) {
    this.callback = cb
  }

  private findAnswer(message: string): string {
    const lowerMessage = message.toLowerCase().trim()

    for (const [key, answer] of Object.entries(QNA_DATABASE)) {
      if (lowerMessage.includes(key)) {
        return answer
      }
    }

    return DEFAULT_RESPONSE
  }

  sendMessage(message: string, _isVoiceInput?: boolean) {
    if (this.currentInterval) {
      clearInterval(this.currentInterval)
      this.currentInterval = undefined
    }

    if (!this.callback) {
      console.error("No callback registered for transport")
      return
    }

    const response = this.findAnswer(message)
    let index = 0

    this.currentInterval = setInterval(() => {
      if (!this.callback) {
        if (this.currentInterval) {
          clearInterval(this.currentInterval)
          this.currentInterval = undefined
        }
        return
      }

      if (index < response.length) {
        this.callback({
          type: "MESSAGE_STREAM",
          payload: response[index],
        })
        index++
      } else {
        if (this.currentInterval) {
          clearInterval(this.currentInterval)
          this.currentInterval = undefined
        }
        this.callback({ type: "MESSAGE_COMPLETE" })
      }
    }, 20)
  }
}
