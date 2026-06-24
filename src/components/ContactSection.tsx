import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Phone, Mail, MapPin } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToastContext } from "@/context/ToastContext";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  type: z.string().min(1, "Please select an inquiry type."),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

const ContactSection = () => {
  const { showToast } = useToastContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      type: "General Inquiry",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed.');
      
      showToast(
        'Message Sent Successfully',
        'Thank you! Our team will respond to your inquiry within 24 hours.'
      );
      form.reset();
    } catch (err: any) {
      showToast(
        'Submission Error',
        err.message || 'Something went wrong. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contact-us" className="py-24" style={{ backgroundColor: "#f5f0e8" }}>
      <div className="container px-6 md:px-10 lg:px-10 mx-auto">
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-serif">Get in Touch</h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            For platform access issues, contact your system administrator.
            For business inquiries about Fresh Sarura or Garden Fresh Rwanda Ltd,
            send us a message and we'll respond within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left Column: Contact info */}
          <div className="space-y-8">
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 text-lg leading-relaxed">
                Fresh Sarura is Garden Fresh Rwanda Ltd's internal export management
                platform, connecting farm managers, quality control, logistics, and
                production under one roof. Reach out for partnership opportunities,
                export sourcing, or general inquiries about our operations.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg text-green-700">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Address</h4>
                  <p className="text-slate-600">Kigali, Rwanda</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg text-green-700">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Email Address</h4>
                  <p className="text-slate-600">info@gardenfreshrwanda.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg text-green-700">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Phone</h4>
                  <p className="text-slate-600">+250 (780) 389-786</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Smart form */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-100">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 font-medium font-serif text-lg">Full Name</     FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} className="border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 font-medium font-serif text-lg">Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="jane@example.com" {...field} className="border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 font-medium font-serif text-lg">Inquiry Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent">
                            <SelectValue placeholder="Select one" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border border-slate-200 shadow-xl z-[100]">
                          <SelectItem value="Export Sourcing">Export Sourcing</SelectItem>
                          <SelectItem value="Outgrower Partnership">Outgrower Partnership</SelectItem>
                          <SelectItem value="Platform Support">Platform Support</SelectItem>
                          <SelectItem value="Export Compliance">Export Compliance</SelectItem>
                          <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 font-medium font-serif text-lg">Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="How can our team support you today?"
                          className="min-h-[120px] border-slate-200 focus:border-green-600 ring-offset-transparent focus-visible:ring-transparent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-6 rounded-md shadow-sm transition-all duration-200 text-lg flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
