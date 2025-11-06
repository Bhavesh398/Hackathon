import { Link } from "react-router-dom";
import { Zap, Github, Twitter, Linkedin, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="p-2 bg-primary rounded-lg group-hover:animate-glow transition-all">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Innovex
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              Transform your hackathon experience with AI-powered management and
              innovation tracking.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-bold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="#features"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  API
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Guides
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Innovex. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built with ❤️ for innovators worldwide
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
