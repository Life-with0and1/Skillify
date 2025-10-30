"use client";

import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Skillify</h3>
            <p className="text-gray-300">
              Connect with experts, share knowledge, and grow your skills through our platform.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-300 hover:text-white">Home</Link></li>
              <li><Link href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link></li>
              <li><Link href="/search" className="text-gray-300 hover:text-white">Find Experts</Link></li>
              <li><Link href="/messages" className="text-gray-300 hover:text-white">Messages</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <i className="fas fa-phone mr-2"></i>
                <span>8744024380</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-envelope mr-2"></i>
                <span>ayushkumarit01@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p>&copy; {new Date().getFullYear()} Skillify. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;