import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  MapPin,
  BedDouble,
  Bath,
  Phone,
  Building2,
  Tag,
  Heart,
} from "lucide-react";

export interface PropertyData {
  id: number;
  title: string;
  location: string;
  city: "Nairobi" | "Mombasa" | "Kisumu" | "Nakuru";
  rentPrice: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: "bedsitter" | "1BR" | "2BR" | "3BR" | "apartment" | "maisonette";
  amenities: string;
  description: string | null;
  landlordName: string | null;
  landlordPhone: string | null;
  imageUrl: string | null;
  isFeatured: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PropertyCardProps {
  property: PropertyData;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const amenityList = property.amenities.split(", ").filter(Boolean);
  const toggleFavorite = trpc.favorites.toggle.useMutation();
  const [isFav, setIsFav] = useState(false);
  const [showHeart, setShowHeart] = useState(true);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsFav(!isFav);
    try {
      const result = await toggleFavorite.mutateAsync({ propertyId: property.id });
      setIsFav(result.isFavorite);
      setShowHeart(true);
    } catch {
      // Revert on error
      setIsFav(!isFav);
    }
    // Animate heart feedback
    setShowHeart(false);
    setTimeout(() => setShowHeart(true), 300);
  };

  return (
    <Card className="property-card overflow-hidden group">
      {/* Property Image */}
      {property.imageUrl && (
        <div className="relative w-full h-40 overflow-hidden bg-muted/50">
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            className={`absolute top-3 right-3 z-10 size-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ease-out ${
              isFav
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white/90 text-muted-foreground hover:bg-white hover:text-red-500"
            }`}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`size-4 transition-transform duration-300 ${isFav ? "fill-current scale-100" : "scale-90"}`}
              key={showHeart ? "visible" : "hidden"}
            />
          </button>
          {/* Property Type Badge on Image */}
          <div className="absolute bottom-3 left-3">
            <Badge
              variant="default"
              className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 shadow-lg"
            >
              {property.propertyType}
            </Badge>
          </div>
        </div>
      )}

      <CardHeader className={`pb-2 ${property.imageUrl ? "pt-4" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold leading-tight">
              {property.title}
            </CardTitle>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span>{property.location}, {property.city}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Key Details */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <BedDouble className="size-4 text-primary" />
            <span>{property.bedrooms === 0 ? "Studio" : `${property.bedrooms} Bed${property.bedrooms > 1 ? "s" : ""}`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="size-4 text-primary" />
            <span>{property.bathrooms} Bath{property.bathrooms > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Tag className="size-4" />
            <span>KES {property.rentPrice.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground font-normal">/mo</span>
          </div>
        </div>

        {/* Description */}
        {property.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {property.description}
          </p>
        )}

        {/* Amenities */}
        {amenityList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenityList.map((amenity, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {amenity}
              </Badge>
            ))}
          </div>
        )}

        {/* Landlord Contact */}
        {property.landlordName && (
          <div className="flex items-center gap-2 pt-1 border-t">
            <Phone className="size-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{property.landlordName}</span>
            {property.landlordPhone && (
              <span className="text-xs text-muted-foreground">
                {property.landlordPhone}
              </span>
            )}
          </div>
        )}

        {/* Favorite action row */}
        {!property.imageUrl && (
          <div className="flex items-center justify-end pt-1 border-t">
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs h-7 px-2 transition-all duration-200 ${
                isFav ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"
              }`}
              onClick={handleToggleFavorite}
            >
              <Heart className={`size-3.5 mr-1 ${isFav ? "fill-current" : ""}`} />
              {isFav ? "Saved" : "Save"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
