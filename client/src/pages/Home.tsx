import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PropertyCard, type PropertyData } from "@/components/PropertyCard";
import {
  Sparkles,
  MapPin,
  BedDouble,
  Bath,
  Tag,
  Home as HomeIcon,
  Search,
  MessageCircle,
  Shield,
  Zap,
  Building2,
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: featuredProperties } = trpc.properties.featured.useQuery();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-card/80 backdrop-blur-md border-b shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <HomeIcon className="size-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Pata<span className="text-primary">Nyumba</span>
            </span>
          </div>
          <Link href="/chat">
            <Button className="rounded-xl shadow-lg shadow-primary/20 transition-transform duration-150 ease-out active:scale-[0.97]">
              Start Searching
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="size-4" />
              <span>AI-Powered Property Search</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Find Your Perfect{" "}
              <span className="text-primary">Rental Home</span>
              <br />
              in Kenya
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Describe what you're looking for in plain language. Our AI agent understands your needs and instantly finds matching rental properties across Kenya's top cities.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/chat">
                <Button
                  size="lg"
                  className="rounded-xl text-base px-8 h-12 shadow-xl shadow-primary/25 transition-all duration-150 ease-out hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.97]"
                >
                  <Search className="size-4 mr-2" />
                  Start Searching
                </Button>
              </Link>
              <Link href="/chat">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl text-base px-8 h-12 border-primary/20 hover:bg-primary/5 transition-all duration-150 ease-out active:scale-[0.97]"
                >
                  <MessageCircle className="size-4 mr-2" />
                  Chat with AI
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">4</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Cities</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">24+</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Listings</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">6</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Property Types</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Three simple steps to find your next home
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="border-none shadow-lg shadow-primary/5 transition-all duration-200 ease-out hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="size-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Describe Your Needs</h3>
                <p className="text-sm text-muted-foreground">
                  Tell our AI what you're looking for — location, budget, bedrooms, and more in natural language.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg shadow-primary/5 transition-all duration-200 ease-out hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="size-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">AI Matches Properties</h3>
                <p className="text-sm text-muted-foreground">
                  Our intelligent agent searches the database and finds the best matches for your requirements.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg shadow-primary/5 transition-all duration-200 ease-out hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="size-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Get Your Results</h3>
                <p className="text-sm text-muted-foreground">
                  Receive detailed property cards with prices, amenities, and landlord contacts to reach out.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Featured Listings
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Hand-picked rental properties across Kenya's top cities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {featuredProperties?.map((property) => (
              <PropertyCard key={property.id} property={property as PropertyData} />
            ))}
          </div>

          {(!featuredProperties || featuredProperties.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="size-12 mx-auto mb-3 opacity-30" />
              <p>No featured listings available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Cities Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Available Cities
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              We cover Kenya's major urban centers
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {["Nairobi", "Mombasa", "Kisumu", "Nakuru"].map((city) => (
              <Card
                key={city}
                className="border-none shadow-md transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-1 cursor-pointer group"
              >
                <CardContent className="p-5 text-center">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="size-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{city}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-10 sm:p-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Ready to Find Your Home?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start chatting with our AI agent now and discover rental properties that match your lifestyle and budget.
            </p>
            <Link href="/chat">
              <Button
                size="lg"
                className="rounded-xl text-base px-8 h-12 shadow-xl shadow-primary/25 transition-all duration-150 ease-out hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.97]"
              >
                <Search className="size-4 mr-2" />
                Start Searching
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
                <HomeIcon className="size-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">
                Pata<span className="text-primary">Nyumba</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered property search for Kenya
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
