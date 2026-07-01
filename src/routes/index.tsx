import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wrench,
  ClipboardList,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Bell,
  ArrowRight,
} from "lucide-react";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: ClipboardList, title: "Raise & Track Complaints", desc: "Log maintenance issues with a category, description and photo — then follow every status update." },
  { icon: BarChart3, title: "Admin Dashboard", desc: "Committee members see totals, status breakdowns and overdue complaints at a glance." },
  { icon: Megaphone, title: "Notice Board", desc: "Publish society notices and pin important announcements to the top." },
  { icon: Bell, title: "Email Notifications", desc: "Residents are notified when a complaint status changes or an important notice is posted." },
  { icon: ShieldCheck, title: "Secure Roles", desc: "Separate, protected experiences for residents and administrators." },
  { icon: Wrench, title: "Full History", desc: "Every complaint keeps a complete, timestamped resolution timeline." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Wrench className="h-6 w-6 text-primary" /> SocietyCare
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Apartment Maintenance, Simplified
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            Maintenance tracking your whole society will actually use
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Residents raise and follow complaints, admins resolve them and post notices — all in one clean,
            responsive portal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              I already have an account
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-card">
          <img src={heroImage} alt="Illustration of an apartment complex with maintenance staff" className="h-full w-full object-cover" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SocietyCare — Apartment Maintenance Tracker
      </footer>
    </div>
  );
}
