import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Star, MessageSquare, Map } from "lucide-react";
import { cn } from "@/lib/utils";

interface RestaurantCardProps {
  name: string;
  address: string;
  rating: number;
  images: string[];
  onLike: () => void;
  onDislike: () => void;
}

export default function RestaurantCard({
  name,
  address,
  rating,
  images,
  onLike,
  onDislike,
}: RestaurantCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-[20px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Image Carousel */}
        <div className="relative aspect-[29/17] bg-gray-200">
          <img
            src={images[currentImageIndex]}
            alt={name}
            className="w-full h-full object-cover"
          />
          
          {/* Navigation Arrows */}
          <button
            onClick={prevImage}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-[0_8px_4px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={nextImage}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-[0_8px_4px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-1 text-sm font-medium">
            {currentImageIndex + 1}/{images.length}
          </div>

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-[#FDA349] text-[#FDA349]" />
            <span className="font-normal text-[11px]">{rating.toFixed(1)}</span>
          </div>

          {/* Carousel Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-[7px]">
            {images.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-[10px] h-[10px] rounded-full transition-opacity",
                  index === currentImageIndex ? "bg-white opacity-100" : "bg-white opacity-70"
                )}
              />
            ))}
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold text-center mb-2">{name}</h2>
          
          <div className="flex items-start gap-1 mb-4 text-[#5D5D5D]">
            <MapPin className="w-[14px] h-[27px] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed flex-1">{address}</p>
          </div>

          {/* Detail Button and Toggle */}
          <div className="flex items-center justify-between mb-4">
            <button className="px-6 py-1.5 rounded-full border border-[#EB8D00] bg-white text-[#EB8D00] font-bold text-[13px] hover:bg-[#EB8D00] hover:text-white transition-colors">
              詳細
            </button>

            <div className="flex items-center gap-2 bg-[#D9D9D9] rounded-full p-1">
              <button
                onClick={() => setShowMap(false)}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  !showMap ? "bg-white" : ""
                )}
                aria-label="Show comments"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowMap(true)}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  showMap ? "bg-white" : ""
                )}
                aria-label="Show map"
              >
                <Map className="w-4 h-4 fill-[#F03939] text-[#1E1E1E]" />
              </button>
            </div>
          </div>

          {/* Comment/Map Section */}
          <div className="w-full h-[300px] rounded-[20px] border border-[#E8E8E8] bg-white flex items-center justify-center text-xs text-gray-500">
            {showMap ? "Google mapここ" : "コメント表示エリア"}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-14 mt-8 mb-8">
        <button
          onClick={onDislike}
          className="w-14 h-14 rounded-full bg-white border border-[#008D05] shadow-[0_8px_4px_rgba(0,0,0,0.25)] flex items-center justify-center text-[#008D05] text-[30px] font-normal hover:bg-[#008D05] hover:text-white transition-colors"
          aria-label="Dislike"
        >
          X
        </button>
        <button
          onClick={onLike}
          className="w-14 h-14 rounded-full bg-white border border-[#FF7D7D] shadow-[0_8px_4px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-[#FF7D7D] transition-colors group"
          aria-label="Like"
        >
          <svg
            className="w-10 h-10"
            viewBox="0 0 42 42"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.5 39.1125L17.9625 36.8025C8.95 28.63 3 23.2225 3 16.625C3 11.2175 7.235 7 12.625 7C15.67 7 18.5925 8.4175 20.5 10.64C22.4075 8.4175 25.33 7 28.375 7C33.765 7 38 11.2175 38 16.625C38 23.2225 32.05 28.63 23.0375 36.8025L20.5 39.1125Z"
              className="fill-[#FF8B8B] group-hover:fill-white transition-colors"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
