'use client'

import Link from 'next/link'
import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import { FaGithub, FaXTwitter, FaTwitter, FaBluesky } from 'react-icons/fa6'
import { PiFediverseLogoFill } from 'react-icons/pi'

// APIインスタンスをメモ化
const useApi = () => {
  return useMemo(() => axios.create({
    baseURL: 'https://wallog.seitendan.com',
    headers: { 
      'Content-Type': 'application/json;charset=utf-8',
      'Access-Control-Allow-Credentials': 'true'
    },
    withCredentials: true
  }), []);
};

// メニューリンクコンポーネント
const MenuLink = React.memo(({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link 
    href={href} 
    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
  >
    {children}
  </Link>
));

// ハンバーガーメニューボタン
const MenuToggleButton = React.memo(({ isOpen, onClick }: { isOpen: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-4 left-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800 md:hidden shadow-lg z-40"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16m-7 6h7"
      />
    </svg>
  </button>
));

// クライアントサイドのみで実行されるコンポーネントとして定義
const NavBarClient = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const api = useApi();

  useEffect(() => {
    setIsMounted(true);
    const checkSession = async () => {
      try {
        const response = await api.get('/api/user/login_check');
        setIsLoggedIn(response.status === 200);
      } catch (err) {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, [api]);

  if (!isMounted) {
    return null; // 初期マウント時は何も表示しない
  }

  const toggleMenu = () => setIsOpen(prev => !prev);

  return (
    <>
      <nav className={`
        w-64 h-screen bg-gray-100 dark:bg-gray-800 fixed left-0 top-0 p-4
        transform transition-transform duration-300 ease-in-out z-30
        md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col justify-between
      `}>
        <div className="flex flex-col space-y-4">
          <MenuLink href="/diary">Diary</MenuLink>
          <MenuLink href="/blog">Blog</MenuLink>
          <MenuLink href="/search">Search</MenuLink>
          {isLoggedIn && <MenuLink href="/drive">Drive</MenuLink>}
          {isLoggedIn && <MenuLink href="/settings">Settings</MenuLink>}
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex justify-center space-x-2">
            <Link 
              href="https://github.com/yuugao-kaori/wallog" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FaGithub className="text-2xl" />
            </Link>
            <Link 
              href="https://x.com/none_none_days" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FaXTwitter className="text-2xl" />
            </Link>
            <Link 
              href="https://twitter.com/takumin3211" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FaTwitter className="text-2xl" />
            </Link>
            <Link 
              href="https://misskey.seitendan.com/@takumin3211" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <PiFediverseLogoFill  className="text-2xl" />
            </Link>
            <Link 
              href="https://bsky.app/profile/takumin3211.bsky.social" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FaBluesky  className="text-2xl" />
            </Link>
          </div>
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            Version 2024.11.26.1800
          </div>
        </div>
      </nav>
      
      <MenuToggleButton isOpen={isOpen} onClick={toggleMenu} />
    </>
  );
};

// Dynamic importを使用してクライアントサイドのみでレンダリング
const NavBar = dynamic(() => Promise.resolve(NavBarClient), {
  ssr: false,
  loading: () => null
});

export default NavBar;