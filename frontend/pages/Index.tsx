import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users, Activity, Droplets, BarChart3, Shield, Zap, Heart, Camera } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background via-secondary/5 to-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-fade-in">
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl shadow-medical-lg animate-float">
              <Stethoscope className="h-20 w-20 md:h-24 md:w-24 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 gradient-medical-text animate-fade-in">
            Smart Community Health Monitoring
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Early Warning System for Water-Borne Diseases in Rural Northeast India
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")} 
              className="text-lg px-8 py-6 h-auto shadow-medical-lg hover:shadow-medical-lg hover:scale-105 transition-all duration-300 btn-glow"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/auth")} 
              className="text-lg px-8 py-6 h-auto border-2 hover:bg-primary/5 transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Card className="text-center border-primary/20 card-hover bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Real-Time Monitoring</p>
            </CardContent>
          </Card>
          <Card className="text-center border-secondary/20 card-hover bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">AI</div>
              <p className="text-sm text-muted-foreground">Powered Analysis</p>
            </CardContent>
          </Card>
          <Card className="text-center border-primary/20 card-hover bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">100+</div>
              <p className="text-sm text-muted-foreground">Villages Covered</p>
            </CardContent>
          </Card>
          <Card className="text-center border-secondary/20 card-hover bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">Fast</div>
              <p className="text-sm text-muted-foreground">Response Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-20">
          <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300 card-hover group animate-slide-in">
            <CardHeader className="pb-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl mb-2">Real-Time Monitoring</CardTitle>
              <CardDescription className="text-base">
                Track health symptoms and disease cases across multiple villages in real-time with instant updates
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-secondary/20 hover:border-secondary/40 transition-all duration-300 card-hover group animate-slide-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-4">
              <div className="p-3 bg-secondary/10 rounded-lg w-fit mb-4 group-hover:bg-secondary/20 transition-colors">
                <Droplets className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="text-xl mb-2">Water Quality Testing</CardTitle>
              <CardDescription className="text-base">
                Monitor water pH and turbidity levels to identify contamination risks using AI-powered image analysis
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-chart-3/20 hover:border-chart-3/40 transition-all duration-300 card-hover group animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-4">
              <div className="p-3 bg-chart-3/10 rounded-lg w-fit mb-4 group-hover:bg-chart-3/20 transition-colors">
                <BarChart3 className="h-8 w-8 text-chart-3" />
              </div>
              <CardTitle className="text-xl mb-2">Smart Alerts</CardTitle>
              <CardDescription className="text-base">
                AI-powered early warning system detects potential disease outbreaks before they spread
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* User Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30 shadow-medical-lg card-hover group animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">For Health Workers</CardTitle>
              </div>
              <CardDescription className="text-base space-y-3">
                <ul className="space-y-3 mt-4">
                  <li className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Monitor all village health reports in real-time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>View disease outbreak alerts instantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Analyze trends with interactive charts and maps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Droplets className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Track water quality across regions</span>
                  </li>
                </ul>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full shadow-md hover:shadow-lg transition-all duration-300" onClick={() => navigate("/auth")}>
                Health Worker Login
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/30 shadow-medical-lg card-hover group animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-secondary/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-2xl">For Village People</CardTitle>
              </div>
              <CardDescription className="text-base space-y-3">
                <ul className="space-y-3 mt-4">
                  <li className="flex items-start gap-2">
                    <Heart className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <span>Report health symptoms easily with guided forms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Camera className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <span>Submit water quality data via photo upload</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <span>Receive instant health alerts and predictions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <span>Access health tips and guidance from experts</span>
                  </li>
                </ul>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-secondary hover:bg-secondary/90 shadow-md hover:shadow-lg transition-all duration-300" onClick={() => navigate("/auth")}>
                Villager Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
