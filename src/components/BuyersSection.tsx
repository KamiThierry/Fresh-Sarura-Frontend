import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRODUCE_OPTIONS = [
  "Avocado Fuerte",
  "Green Bird Eye Chilli",
  "French Beans",
  "Passion Fruit",
  "Hass Avocado",
];

const COUNTRY_CODES = [
  { label: "Rwanda (+250)", value: "+250" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "Netherlands (+31)", value: "+31" },
  { label: "United Arab Emirates (+971)", value: "+971" },
  { label: "United States (+1)", value: "+1" },
  { label: "Kenya (+254)", value: "+254" },
  { label: "Germany (+49)", value: "+49" },
  { label: "Belgium (+32)", value: "+32" },
  { label: "France (+33)", value: "+33" },
  { label: "Uganda (+256)", value: "+256" },
  { label: "Tanzania (+255)", value: "+255" },
];

const BuyersSection = () => {
  const [form, setForm] = useState({
    company: "",
    email: "",
    phone: "",
    countryCode: "+250",
    produce: {} as Record<string, string>, // Mapping produce item to volume
  });
  
  const [openCountrySearch, setOpenCountrySearch] = useState(false);

  const toggleProduce = (item: string) => {
    setForm((prev) => {
      const newProduce = { ...prev.produce };
      if (newProduce[item] !== undefined) {
        delete newProduce[item];
      } else {
        newProduce[item] = "1"; // Default volume to 1 Ton
      }
      return { ...prev, produce: newProduce };
    });
  };

  const handleVolumeChange = (item: string, volume: string) => {
    setForm((prev) => ({
      ...prev,
      produce: { ...prev.produce, [item]: volume },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(form.produce).length === 0) {
      toast.error("Please select at least one produce type.");
      return;
    }
    
    // Check if all selected items have a volume > 0
    const invalidItems = Object.entries(form.produce).filter(([_, vol]) => !vol || parseFloat(vol) <= 0);
    if (invalidItems.length > 0) {
      toast.error("Please specify a valid volume for all selected products.");
      return;
    }

    console.log("Sourcing Request Submitted:", form);
    toast.success("Sourcing request submitted! We'll be in touch shortly.");
    setForm({
      company: "",
      email: "",
      phone: "",
      countryCode: "+250",
      produce: {},
    });
  };

  return (
    <section id="buyers" className="py-20 md:py-28 bg-section-alt">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-serif">Source with Confidence.<br />Fully Traceable, Export-Ready.</h2>
            <p className="text-muted-foreground leading-relaxed max-w-lg">
              We supply the UK, Netherlands, and Middle East with GlobalG.A.P. compliant produce. Our digital farm management system guarantees total visibility from the soil to the packhouse.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {["GlobalG.A.P.", "NAEB Registered", "Full Traceability"].map((t) => (
                <span key={t} className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 font-serif leading-tight">Request a Quote</h3>
              <p className="text-slate-500 text-sm">Specify your required tonnage for each product.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Popover open={openCountrySearch} onOpenChange={setOpenCountrySearch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCountrySearch}
                      className="w-[110px] justify-between bg-slate-50 border-slate-200 px-3 shrink-0"
                    >
                      {form.countryCode}
                      <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search country..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {COUNTRY_CODES.map((code) => (
                            <CommandItem
                              key={code.value}
                              value={code.label}
                              onSelect={() => {
                                setForm({ ...form, countryCode: code.value });
                                setOpenCountrySearch(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.countryCode === code.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {code.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="flex-1" />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Produce Type & Volume (Select all that apply)</Label>
              <div className="space-y-3 p-4 bg-slate-50 rounded-md border border-slate-100 min-h-[140px]">
                {PRODUCE_OPTIONS.map((item) => {
                  const isChecked = form.produce[item] !== undefined;
                  return (
                    <div key={item} className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={item} 
                          checked={isChecked} 
                          onCheckedChange={() => toggleProduce(item)}
                        />
                        <label htmlFor={item} className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                          {item}
                        </label>
                      </div>
                      {isChecked && (
                        <div className="flex items-center gap-3 pl-6 animate-in slide-in-from-left-2 fade-in duration-300">
                          <div className="relative flex-1 max-w-[140px]">
                            <Input 
                              type="number" 
                              min="0.1" 
                              step="0.1"
                              value={form.produce[item]} 
                              onChange={(e) => handleVolumeChange(item, e.target.value)}
                              className="h-9 pr-12 focus:border-green-600"
                              required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Tons</span>
                          </div>
                          <span className="text-xs text-slate-400 italic">Target Volume</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white py-6 shadow-sm shadow-green-900/10">
              Submit Sourcing Request
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default BuyersSection;
