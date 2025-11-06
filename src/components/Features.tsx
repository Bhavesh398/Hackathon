import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  Award,
  Users,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Trophy,
  DollarSign,
} from "lucide-react";
import aiBuddyImage from "@/assets/ai-buddy.jpg";
import certificateImage from "@/assets/certificate-preview.jpg";

const features = [
  {
    icon: Bot,
    title: "AI Buddy Mentor",
    description:
      "Your intelligent assistant helps participants brainstorm ideas, choose tech stacks, and stay on track throughout the hackathon.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Award,
    title: "QR-Verified Certificates",
    description:
      "Each participant receives a unique certificate with QR code authentication, ensuring credibility and preventing fraud.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Users,
    title: "Advanced Judge Panel",
    description:
      "Dedicated portal for judges with score sliders, feedback text boxes, and automatic score calculation for fair evaluation.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: MapPin,
    title: "Hybrid Events",
    description:
      "Support both online and offline hackathons with location tracking, maps, and venue details for seamless participation.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: ShieldCheck,
    title: "Plagiarism Detection",
    description:
      "AI-powered originality checks for submissions ensure authentic and innovative projects through advanced NLP analysis.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Trophy,
    title: "Recognition System",
    description:
      "Showcase winners, runners-up, and special categories with detailed prize information and achievement badges.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: TrendingUp,
    title: "Incubation Tracking",
    description:
      "Selected teams continue their journey with progress dashboards, mentor feedback, and milestone tracking post-event.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: DollarSign,
    title: "Prize Money Tracker",
    description:
      "Transparent display of winning amounts in rupees, helping participants understand the stakes and rewards.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful Features That
            <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Set Us Apart
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to run a successful hackathon, from planning to
            post-event incubation
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-lg transition-all duration-300 animate-fade-in-up border-border hover:border-primary/50"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Highlighted Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all animate-fade-in">
            <div className="aspect-video overflow-hidden">
              <img
                src={aiBuddyImage}
                alt="AI Buddy mentor interface showing intelligent assistance"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                AI Buddy in Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our AI mentor doesn't just filter events - it actively guides
                participants through ideation, technology selection, and
                problem-solving with natural conversation.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-2 border-secondary/20 hover:border-secondary/40 transition-all animate-fade-in">
            <div className="aspect-video overflow-hidden">
              <img
                src={certificateImage}
                alt="Digital certificate with QR code verification"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Award className="w-6 h-6 text-secondary" />
                Verified Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Every certificate comes with a unique QR code that links to a
                verification page, ensuring authenticity and making your
                achievement trustworthy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Features;
