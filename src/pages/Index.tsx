import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import DashboardPreviewSection from "@/components/DashboardPreviewSection";

import ForYourTeamSection from "@/components/ForYourTeamSection";

import ProductionChainSection from "@/components/ProductionChainSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
    <Navbar />
    <HeroSection />

    <HowItWorksSection />
    <DashboardPreviewSection />
    <ForYourTeamSection />

    <ProductionChainSection />
    <ContactSection />
    <Footer />
  </div>
);

export default Index;
