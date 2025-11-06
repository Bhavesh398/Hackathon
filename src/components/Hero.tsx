import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-hackathon.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Diverse team collaborating on innovative projects"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-background/90" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 relative">
        <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/30 mb-6 animate-scale-in">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary-foreground">
              AI-Powered Hackathon Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-primary-foreground">
            Transform Your
            <span className="block bg-gradient-to-r from-secondary to-secondary/70 bg-clip-text text-transparent">
              Hackathon Experience
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            From AI mentoring to QR-verified certificates, manage every aspect of your hackathon with innovation and efficiency.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground group text-lg px-8"
              >
                Start
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8"
              >
                Browse Events
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-primary-foreground/20">
            <div className="animate-fade-in">
              <div className="text-4xl font-bold text-secondary mb-2">10K+</div>
              <div className="text-primary-foreground/80">Participants</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="text-4xl font-bold text-secondary mb-2">500+</div>
              <div className="text-primary-foreground/80">Events Hosted</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="text-4xl font-bold text-secondary mb-2">98%</div>
              <div className="text-primary-foreground/80">Satisfaction</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="text-4xl font-bold text-secondary mb-2">24/7</div>
              <div className="text-primary-foreground/80">AI Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};

export default Hero;
