import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { NotificationProvider } from '@/context/NotificationContext';

const Layout = () => {
    return (
        <NotificationProvider>
            <div className="relative h-screen bg-[#F4F7FA] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
                {/* Subtle green-tinted background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#F4F7FA] via-[#E8F5E9] to-[#F4F7FA] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 opacity-40 pointer-events-none" />

                <Sidebar />
                <Header />

                {/* Main content */}
                <main className="fixed top-[84px] left-[10px] md:left-[280px] right-[10px] bottom-[10px] overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-200 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-700 rounded-2xl">
                    <Outlet />
                </main>
            </div>
        </NotificationProvider>
    );
};

export default Layout;
