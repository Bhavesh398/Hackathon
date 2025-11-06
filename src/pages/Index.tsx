import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Recognition from "@/components/Recognition";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import AISaathi from "@/components/AISaathi";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Recognition />
      </main>
      <Footer />
      <ThemeToggle />
      <AISaathi />
    </div>
  );
};

export default Index;
