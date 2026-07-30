import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  BedDouble,
  Bath,
  Phone,
  Building2,
  Tag,
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

  return (
    <Card className="property-card overflow-hidden">
      <CardHeader className="pb-2">
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
          <Badge
            variant="default"
            className="shrink-0 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5"
          >
            {property.propertyType}
          </Badge>
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
      </CardContent>
    </Card>
  );
}
