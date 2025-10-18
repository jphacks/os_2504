import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantCard from "@/components/RestaurantCard";

const mockRestaurants = [
  {
    id: 1,
    name: "餃子の王将 TY店",
    address: "京都府京都市左京区北白川大堂町51",
    rating: 3.3,
    images: [
      "https://api.builder.io/api/v1/image/assets/TEMP/b94ffc0a17a09de367e25f41a131bb72fe10716d?width=696",
      "https://api.builder.io/api/v1/image/assets/TEMP/b94ffc0a17a09de367e25f41a131bb72fe10716d?width=696",
      "https://api.builder.io/api/v1/image/assets/TEMP/b94ffc0a17a09de367e25f41a131bb72fe10716d?width=696",
      "https://api.builder.io/api/v1/image/assets/TEMP/b94ffc0a17a09de367e25f41a131bb72fe10716d?width=696",
      "https://api.builder.io/api/v1/image/assets/TEMP/b94ffc0a17a09de367e25f41a131bb72fe10716d?width=696",
    ],
  },
];

export default function Index() {
  const [currentRestaurantIndex, setCurrentRestaurantIndex] = useState(0);
  const [likedRestaurants, setLikedRestaurants] = useState<number[]>([]);
  const [dislikedRestaurants, setDislikedRestaurants] = useState<number[]>([]);

  const currentRestaurant = mockRestaurants[currentRestaurantIndex];

  const handleLike = () => {
    if (currentRestaurant) {
      setLikedRestaurants([...likedRestaurants, currentRestaurant.id]);
      nextRestaurant();
    }
  };

  const handleDislike = () => {
    if (currentRestaurant) {
      setDislikedRestaurants([...dislikedRestaurants, currentRestaurant.id]);
      nextRestaurant();
    }
  };

  const nextRestaurant = () => {
    if (currentRestaurantIndex < mockRestaurants.length - 1) {
      setCurrentRestaurantIndex(currentRestaurantIndex + 1);
    } else {
      console.log("No more restaurants");
    }
  };

  if (!currentRestaurant) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FFF9E1]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              すべてのレストランを確認しました！
            </h2>
            <p className="mt-4 text-gray-600">
              いいね: {likedRestaurants.length} | パス: {dislikedRestaurants.length}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9E1]">
      <Header />
      
      <main className="flex-1 py-6">
        <RestaurantCard
          key={currentRestaurant.id}
          name={currentRestaurant.name}
          address={currentRestaurant.address}
          rating={currentRestaurant.rating}
          images={currentRestaurant.images}
          onLike={handleLike}
          onDislike={handleDislike}
        />
      </main>

      <Footer />
    </div>
  );
}
