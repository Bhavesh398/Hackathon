import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-primary rounded-lg group-hover:animate-glow transition-all">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Innovex
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#recognition" className="text-foreground hover:text-primary transition-colors">
              Recognition
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                className="text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#recognition"
                className="text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Recognition
              </a>
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Link to="/auth">
                  <Button variant="ghost" className="w-full">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button className="w-full bg-primary hover:bg-primary/90">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
