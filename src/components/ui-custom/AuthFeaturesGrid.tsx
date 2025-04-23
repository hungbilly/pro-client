
import { CalendarCheck, Users, FileText, FilePen, DollarSign, Receipt } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Management",
    desc: "Easily manage all your clients, contacts & notes in one place."
  },
  {
    icon: FilePen,
    title: "Invoice Creating",
    desc: "Create, send and manage professional invoices seamlessly."
  },
  {
    icon: CalendarCheck,
    title: "Job Tracking",
    desc: "Track jobs, appointments & deadlines efficiently."
  },
  {
    icon: CalendarCheck,
    title: "Auto Google Calendar",
    desc: "Add events directly to Google Calendar automatically."
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    desc: "Monitor your expenses and outgoing payments."
  },
  {
    icon: DollarSign,
    title: "Profit Calculating",
    desc: "Know your business profits in real time."
  }
];

export function AuthFeaturesGrid() {
  return (
    <section className="w-full bg-gradient-to-b from-white via-sky-50 to-slate-100 py-12 mt-10">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl text-center font-bold mb-8">
          <span className="text-gray-800">Our </span>
          <span className="text-primary">Features</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center px-2 py-5">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-sky-100 mb-4 shadow-sm">
                <f.icon className="text-primary w-10 h-10" />
              </div>
              <div className="font-semibold text-xl mb-2 text-gray-800">{f.title}</div>
              <div className="text-gray-500 text-sm">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AuthFeaturesGrid;
