import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductModal from "./ProductModal";
import avovadoFuerteImg from "@/assets/avovadofuerte.webp";
import greenChilliImg from "@/assets/green-chillies.webp";
import frenchBeansImg from "@/assets/French Beans.png";
import passionFruitImg from "@/assets/PassionFruit.webp";
import snowPeasImg from "@/assets/beans-peas.jpg";
import hassAvocadoImg from "@/assets/avocado_hass.jpg";
import premiumChiliesImg from "@/assets/chilies.jpg";

const products = [
  {
    name: "Snow Peas",
    image: snowPeasImg,
    color: "green",
    availability: [true, true, true, true, true, true, true, true, true, true, true, true],
    packing: ["5kg carton", "1.5kg crate"],
  },
  {
    name: "Avocado Fuerte",
    image: avovadoFuerteImg,
    color: "green",
    availability: [true, true, true, true, true, false, false, false, false, true, true, true],
    packing: ["10kg box", "4kg tray"],
  },
  {
    name: "Green Bird Eye Chilli",
    image: greenChilliImg,
    color: "green",
    availability: [true, true, true, true, true, true, true, true, true, true, true, true],
    packing: ["3kg punnet", "5kg bag"],
  },
  {
    name: "French Beans",
    image: frenchBeansImg,
    color: "green",
    availability: [true, true, true, true, true, true, true, true, true, true, true, true],
    packing: ["5kg carton", "2.5kg pre-pack"],
  },
  {
    name: "Passion Fruit",
    image: passionFruitImg,
    color: "purple",
    availability: [true, true, true, false, false, false, false, true, true, true, false, false],
    packing: ["5kg box", "2kg tray"],
  },
  {
    name: "Hass Avocado",
    image: hassAvocadoImg,
    color: "green",
    availability: [true, true, true, true, true, false, false, false, false, true, true, true],
    packing: ["10kg box", "4kg tray"],
  },
  {
    name: "Premium Chilies",
    image: premiumChiliesImg,
    color: "green",
    availability: [true, true, true, true, true, true, true, true, true, true, true, true],
    packing: ["3kg punnet", "5kg bag"],
  },
];

const ProduceSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openProductIndex, setOpenProductIndex] = useState<number | null>(null);

  const nextSlide = () => {
    setOpenProductIndex(null);
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const prevSlide = () => {
    setOpenProductIndex(null);
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  // Indices of the 5 visible items
  const visibleIndices = [
    (currentIndex + 0) % products.length,
    (currentIndex + 1) % products.length,
    (currentIndex + 2) % products.length, // Center item
    (currentIndex + 3) % products.length,
    (currentIndex + 4) % products.length,
  ];

  return (
    <section id="produce" className="py-20 bg-[#fef9ec]">
      <div className="container px-4">
        <h2 className="text-3xl md:text-4xl text-center mb-16 font-serif font-bold text-slate-800">
          Our Products
        </h2>

        <div className="relative flex items-center justify-center">
          {/* Left Arrow */}
          <button
            onClick={prevSlide}
            className="absolute left-0 z-10 p-2 bg-[#1a4a34] text-white rounded-full transition-transform hover:scale-110 shadow-md"
            aria-label="Previous Procuct"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Carousel Viewport */}
          <div className="flex items-center gap-4 w-full overflow-hidden px-14 py-10 justify-center">
            {visibleIndices.map((idx, pos) => {
              const product = products[idx];
              const isCenter = pos === 2;

              return (
                <div
                  key={`${currentIndex}-${pos}`}
                  className={cn(
                    "flex-1 group relative flex flex-col items-center transition-all duration-500",
                    isCenter ? "bg-white p-8 rounded-xl shadow-xl scale-110 z-10 border border-slate-100" : "hidden md:flex opacity-70 scale-90"
                  )}
                >
                  <div className="relative w-full aspect-square mb-6 flex items-center justify-center overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
                    />
                    
                    {/* Hover Button - Center-bottom slide up */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenProductIndex(idx);
                      }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1a4a34] text-white text-[11px] font-bold px-6 py-2.5 rounded-full shadow-lg transition-all duration-300 opacity-100 translate-y-0 md:opacity-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 hover:bg-[#2d6a4f]"
                    >
                      More Info
                    </button>
                  </div>

                  <h3
                    className={cn(
                      "text-sm md:text-base font-bold whitespace-nowrap",
                      product.color === "purple" ? "text-[#a04e9c]" : "text-[#2d6a4f]"
                    )}
                  >
                    {product.name}
                  </h3>

                  {/* Modal Overlay Overlay */}
                  <ProductModal 
                    product={product} 
                    isOpen={openProductIndex === idx} 
                    onClose={() => setOpenProductIndex(null)}
                  />
                </div>
              );
            })}
          </div>

          {/* Right Arrow */}
          <button
            onClick={nextSlide}
            className="absolute right-0 z-10 p-2 bg-[#1a4a34] text-white rounded-full transition-transform hover:scale-110 shadow-md"
            aria-label="Next Procuct"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          {/* <button className="bg-[#f2b342] hover:bg-[#e8a335] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all hover:scale-105">
            More Products
          </button> */}
        </div>
      </div>
    </section>
  );
};

export default ProduceSection;
