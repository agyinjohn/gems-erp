import { Package, Boxes, ShoppingCart, CreditCard, Truck, BarChart3, Users, Phone, MoreHorizontal } from 'lucide-react';

export default function Footer() {
  const modules = [
    { name: 'Stocks', icon: Package },
    { name: 'Inventory', icon: Boxes },
    { name: 'Sales', icon: ShoppingCart },
    { name: 'eCommerce', icon: CreditCard },
    { name: 'Payments', icon: CreditCard },
    { name: 'Procurement', icon: Truck },
    { name: 'Finance', icon: BarChart3 },
    { name: 'Accounting', icon: BarChart3 },
    { name: 'HR', icon: Users },
    { name: 'CRM', icon: Phone },
    { name: 'POS', icon: ShoppingCart },
    { name: 'And more...', icon: MoreHorizontal },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-3">GThink ERP</h2>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            The all-in-one business management platform for growing companies in Africa. 
            Stocks, Sales, Finance, HR, Procurement and CRM — all connected in real time.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="mb-12">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-6">Integrated Modules</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.name} className="flex flex-col items-center text-center group cursor-pointer">
                  <div className="mb-2 p-3 rounded-lg bg-gray-800 group-hover:bg-blue-600 transition-colors">
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{module.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>&copy; 2024 GThink ERP. All rights reserved. | Empowering African Businesses</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
