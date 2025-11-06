import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Briefcase, Trophy, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign Up & Choose Role",
    description:
      "Register as Admin, Participant, or Judge. Each role gets a customized dashboard tailored to their needs.",
    step: "01",
  },
  {
    icon: Briefcase,
    title: "Create or Join Events",
    description:
      "Admins set up hackathons with custom criteria. Participants browse and join events with AI Buddy's guidance.",
    step: "02",
  },
  {
    icon: Trophy,
    title: "Compete & Evaluate",
    description:
      "Submit projects, get plagiarism-checked, and receive scores from judges using our advanced evaluation system.",
    step: "03",
  },
  {
    icon: Rocket,
    title: "Win & Incubate",
    description:
      "Winners get recognized, receive verified certificates, and can continue in incubation programs with mentor support.",
    step: "04",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple Process,
            <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Powerful Results
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes and run your hackathon like a pro
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-30" />

          {steps.map((step, index) => (
            <Card
              key={index}
              className="relative group hover:shadow-xl transition-all duration-300 animate-fade-in-up border-border hover:border-primary/50"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Step Number Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg group-hover:scale-110 transition-transform z-10">
                {step.step}
              </div>

              <CardContent className="pt-16 px-6 pb-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 animate-fade-in">
            <h3 className="text-2xl font-bold mb-3">Ready to Get Started?</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Join thousands of innovators already using Innovex to transform
              their hackathon experience
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                Create Your First Event
              </button>
              <button className="px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
                Explore as Participant
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
