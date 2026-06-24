import { ShieldCheck, Leaf, Users } from "lucide-react";

const WhySection = () => {
    const features = [
        {
            icon: <ShieldCheck size={24} />,
            title: "Farm-Level Traceability",
            text: "Every batch is digitally tagged at source, ensuring complete visibility from Rwandan highlands to global tables."
        },
        {
            icon: <Leaf size={24} />,
            title: "Premium Quality Control",
            text: "Our agronomists work directly with outgrowers to ensure every harvest meets the highest international standards."
        },
        {
            icon: <Users size={24} />,
            title: "Empowering Outgrowers",
            text: "We provide local farmers with technical support, fair pricing, and direct access to premium global markets."
        }
    ];

    return (
        <section className="value-section">
            <div className="container mx-auto">
                <div className="max-w-3xl mb-16">
                    <p className="text-green-600 font-semibold tracking-wider uppercase text-sm mb-4">Why Fresh Sarura</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight font-serif mb-6">
                        Bridging Rwanda's Best Farms with Global Markets.
                    </h2>
                </div>
                
                <div className="cards-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card">
                            <div className="card-icon">
                                {feature.icon}
                            </div>
                            <h3 className="card-title">{feature.title}</h3>
                            <p className="card-text">{feature.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhySection;