import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star } from "lucide-react";

const winners = [
  {
    name: "Team Alpha",
    event: "Tech Innovation Hackathon 2024",
    position: "Winner",
    prize: "₹10,00,000",
    icon: Trophy,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    name: "Code Warriors",
    event: "AI Challenge Summit",
    position: "Runner-up",
    prize: "₹5,00,000",
    icon: Medal,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "Innovate Squad",
    event: "Green Tech Hackathon",
    position: "Best Innovation",
    prize: "₹3,00,000",
    icon: Award,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    name: "Future Builders",
    event: "Social Impact Hack",
    position: "People's Choice",
    prize: "₹2,00,000",
    icon: Star,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const Recognition = () => {
  return (
    <section id="recognition" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Celebrate Success &
            <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Recognition
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Showcase your achievements and be recognized for your innovation
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {winners.map((winner, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 animate-fade-in-up border-border hover:border-primary/50 overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`h-2 ${winner.bgColor}`} />
              <CardContent className="pt-6">
                <div
                  className={`w-16 h-16 rounded-full ${winner.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <winner.icon className={`w-8 h-8 ${winner.color}`} />
                </div>
                <Badge variant="secondary" className="mb-2">
                  {winner.position}
                </Badge>
                <h3 className="text-xl font-bold mb-2">{winner.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {winner.event}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Prize</span>
                  <span className="text-lg font-bold text-primary">
                    {winner.prize}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border animate-fade-in">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                ₹2.5Cr+
              </div>
              <div className="text-muted-foreground">Total Prizes Awarded</div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-secondary to-secondary/70 bg-clip-text text-transparent mb-2">
                1,500+
              </div>
              <div className="text-muted-foreground">Winners Recognized</div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                100+
              </div>
              <div className="text-muted-foreground">Teams in Incubation</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Recognition;
