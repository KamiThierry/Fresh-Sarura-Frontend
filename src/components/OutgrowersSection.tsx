import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  Sprout, 
  Coins, 
  ShieldCheck, 
  Check, 
  ChevronsUpDown, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const districts = [
  "Bugesera", "Burera", "Gakenke", "Gasabo", "Gatsibo", "Gicumbi", "Gisagara", 
  "Huye", "Kamonyi", "Karongi", "Kayonza", "Kicukiro", "Kirehe", "Muhanga", 
  "Musanze", "Ngoma", "Ngororero", "Nyabihu", "Nyagatare", "Nyamagabe", 
  "Nyamasheke", "Nyanza", "Nyarugenge", "Nyaruguru", "Rubavu", "Ruhango", 
  "Rulindo", "Rusizi", "Rutsiro", "Rwamagana"
].sort();

const crops = [
  "Avocado Fuerte", "Hass Avocado", "French Beans", "Snow Peas", 
  "Bird Eye Chilli", "Passion Fruit", "Other"
];

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters."),
  phoneNumber: z.string().regex(/^\d{9}$/, "Enter a valid Rwandan phone number (9 digits)."),
  location: z.string({ required_error: "Please select a district." }),
  crop: z.string({ required_error: "Please select a crop." }),
  farmSize: z.string().min(1, "Farm size is required."),
});

const benefits = [
  { 
    id: "01",
    icon: Sprout, 
    title: "Digital Farm Management", 
    desc: "Track every input, spray, and harvest digitally with our easy-to-use mobile tools." 
  },
  { 
    id: "02",
    icon: Coins, 
    title: "Input Financing", 
    desc: "Access quality seeds, organic fertilizers, and professional irrigation systems on credit." 
  },
  { 
    id: "03",
    icon: ShieldCheck, 
    title: "Guaranteed Market", 
    desc: "Sell directly to international buyers at fair, guaranteed prices with total transparency." 
  },
];

const OutgrowersSection = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      location: "",
      crop: "",
      farmSize: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    console.log("Form values:", values);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const scrollToApply = () => {
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="outgrowers" className="py-20 md:py-28 bg-[#f8f5ef]">
      <div className="container px-4 mx-auto">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
            Join 500+ outgrowers already on the network
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6 leading-tight">
            Everything You Need, <br className="hidden md:block" />From Field to Export.
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed mb-8">
            Partner with Fresh Sarura to digitize your farm operations. We provide expert agronomic support, 
            transparent input financing, and direct access to global export markets.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {benefits.map((b) => (
            <div 
              key={b.id} 
              className="relative group bg-[#eaf5ee] p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-green-900/5 overflow-hidden"
            >
              {/* Step Number Badge */}
              <div className="absolute top-4 right-6 text-4xl font-serif font-bold text-green-800/10">
                {b.id}
              </div>
              
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm mb-6 transition-transform duration-300 group-hover:scale-110">
                <b.icon className="w-7 h-7 text-green-700" />
              </div>
              
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-4">{b.title}</h3>
              <p className="text-slate-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mb-24">
          <Button 
            onClick={scrollToApply}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-7 px-10 rounded-full text-lg shadow-lg shadow-green-900/10 transition-all hover:scale-105"
          >
            Join as an Outgrower
          </Button>
        </div>

        {/* Application Form Card */}
        <div id="apply" className="max-w-2xl mx-auto">
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
            {!isSubmitted ? (
              <>
                <div className="text-center mb-10">
                  <h3 className="text-3xl font-serif font-bold text-slate-900 mb-3">Apply to Our Network</h3>
                  <p className="text-slate-500 text-sm">
                    Fill in your details below. Our team will review and contact you within 48 hours.
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Full Name */}
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium font-serif">Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="E.g. Uwimana Jean" 
                                {...field} 
                                className={cn(
                                  "h-12 border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent transition-colors",
                                  form.formState.errors.fullName && "border-red-500"
                                )}
                              />
                            </FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )}
                      />

                      {/* Phone Number */}
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium font-serif">Phone Number</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <span className="absolute left-3 text-slate-400 font-medium text-sm">+250</span>
                                <Input 
                                  placeholder="788 123 456" 
                                  {...field} 
                                  className={cn(
                                    "h-12 pl-14 border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent transition-colors",
                                    form.formState.errors.phoneNumber && "border-red-500"
                                  )}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Farm Location (District) */}
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-slate-700 font-medium font-serif mb-1.5">Farm Location (District)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "h-12 justify-between text-left font-normal border-slate-200 hover:bg-white hover:border-green-600",
                                      !field.value && "text-muted-foreground",
                                      form.formState.errors.location && "border-red-500"
                                    )}
                                  >
                                    {field.value || "Select district"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search district..." className="h-9" />
                                  <CommandList>
                                    <CommandEmpty>No district found.</CommandEmpty>
                                    <CommandGroup>
                                      {districts.map((district) => (
                                        <CommandItem
                                          value={district}
                                          key={district}
                                          onSelect={() => {
                                            form.setValue("location", district, { shouldValidate: true });
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              district === field.value ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {district}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage className="text-xs text-red-500 mt-1" />
                          </FormItem>
                        )}
                      />

                      {/* Current Crop */}
                      <FormField
                        control={form.control}
                        name="crop"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium font-serif">Current Crop</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className={cn(
                                    "h-12 border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent",
                                    form.formState.errors.crop && "border-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select crop" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {crops.map(crop => (
                                  <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Farm Size */}
                    <FormField
                      control={form.control}
                      name="farmSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium font-serif">Farm Size (Hectares)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              placeholder="E.g. 2.5" 
                              {...field} 
                              className={cn(
                                "h-12 border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent transition-colors",
                                form.formState.errors.farmSize && "border-red-500"
                              )}
                            />
                          </FormControl>
                          <FormMessage className="text-xs text-red-500" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full md:w-auto px-10 h-14 bg-green-700 hover:bg-green-800 text-white font-bold rounded-2xl text-lg shadow-lg shadow-green-900/10 transition-all flex items-center gap-2 disabled:opacity-70"
                      >
                        {isSubmitting ? "Submitting..." : "Submit Application"}
                        {!isSubmitting && <ArrowRight size={20} />}
                      </Button>
                    </div>
                  </form>
                </Form>
              </>
            ) : (
              <div className="py-12 text-center animate-in fade-in zoom-in duration-500">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 text-green-600 mb-8">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-4xl font-serif font-bold text-slate-900 mb-4">Application Received!</h3>
                <p className="text-slate-500 text-lg">
                  Thank you for applying. <br />We'll be in touch with you within 48 hours.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-10 rounded-full px-8 py-6 border-slate-200 hover:bg-slate-50 font-semibold"
                  onClick={() => setIsSubmitted(false)}
                >
                  Apply Again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OutgrowersSection;
