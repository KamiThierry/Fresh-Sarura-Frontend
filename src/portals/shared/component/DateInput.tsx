import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateInputProps {
    name: string;
    value: string; // YYYY-MM-DD
    onChange: (name: string, value: string) => void;
    placeholder?: string;
    className?: string;
}

const DateInput = ({ name, value, onChange, placeholder = 'DD/MM/YYYY', className }: DateInputProps) => {
    // Handle empty or invalid values safely
    const selected = value ? new Date(value) : null;

    const handleChange = (date: Date | null) => {
        if (!date) { 
            onChange(name, ''); 
            return; 
        }
        // Use local date values to avoid timezone shifts when converting to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        onChange(name, formatted);
    };

    return (
        <ReactDatePicker
            selected={selected && !isNaN(selected.getTime()) ? selected : null}
            onChange={handleChange}
            dateFormat="dd/MM/yyyy"
            placeholderText={placeholder}
            className={className}
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            autoComplete="off"
        />
    );
};

export default DateInput;
