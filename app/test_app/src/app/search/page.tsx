'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PostCard from '@/components/PostCard';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns'; // 追加

interface Post {
  post_id: string;
  post_createat: string;
  post_text: string;
  post_tag: string;
  post_file?: string;
  created_at: string;
  user_id: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const urlSearchText = searchParams.get('searchText') || '';
  const urlSearchType = searchParams.get('searchType') || 'full_text';

  const [searchText, setSearchText] = useState(urlSearchText);
  const [searchType, setSearchType] = useState(urlSearchType);
  const [results, setResults] = useState<Post[]>([]);
  const [offset, setOffset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const observer = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = true;
  const [sinceDate, setSinceDate] = useState<string>('');
  const [untilDate, setUntilDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10; // 1ページあたりの表示件数

  const formatDate = (date: Date): string => {
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  // 追加: 日時をpost_idに変換する関数
  const convertDateToPostId = (dateStr: string, isStart: boolean): string => {
    const date = new Date(dateStr);
    const formatString = format(date, 'yyyyMMddHHmmss');
    const randomDigits = isStart ? '000000' : '999999';
    return `${formatString}${randomDigits}`;
  };

  const performSearch = useCallback(
    async (searchTerm: string, searchMode: string, initial = true, page = 1) => {
      // 検索条件の検証を修正
      if (searchTerm.trim() === '' && !sinceDate && !untilDate) {
        alert('検索文字を入力するか、日時を指定してください。');
        return;
      }

      if (loading) return;

      if (initial) {
        setLoading(true);
        setError(null);
        setResults([]);
        setOffset(null);
        setHasMore(false);
      }

      try {
        // 基本のAPIエンドポイントを設定
        const baseUrl = '/api/post/search';
        let apiUrl = searchTerm.trim() !== '' 
          ? `${baseUrl}/${encodeURIComponent(searchTerm)}`
          : baseUrl;

        // パラメータの構築を修正
        const params: Record<string, string> = {};
        params.from = String((page - 1) * pageSize);
        params.size = String(pageSize);
        if (sinceDate) params.since = convertDateToPostId(sinceDate, true);
        if (untilDate) params.until = convertDateToPostId(untilDate, false);

        const queryString = new URLSearchParams(params).toString();
        const fullUrl = `${apiUrl}${queryString ? `?${queryString}` : ''}`;

        const response = await axios.get(fullUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        // レスポンスデータの型チェックと変換を明示的に行う
        const { hits, total } = response.data;
        if (!Array.isArray(hits)) {
          throw new Error('Invalid response format');
        }

        const cleanData = hits.map((post: Post) => ({
          post_id: post.post_id,
          post_createat: post.post_createat,
          post_text: post.post_text,
          post_tag: post.post_tag,
          post_file: post.post_file,
          created_at: post.created_at,
          user_id: post.user_id
        }));
        
        setResults(cleanData);
        setTotalPages(Math.ceil(total / pageSize));
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      } finally {
        setLoading(false);
      }
    },
    [loading, sinceDate, untilDate]
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    const apiUrl = searchType === 'full_text'
      ? `/api/post/search/${encodeURIComponent(searchText)}`
      : `/api/post/tag_search/${encodeURIComponent(searchText)}`;

    const params = new URLSearchParams({
      ...(offset && { offset: offset }),
      limit: '10',
    });

    try {
      const response = await axios.get(`${apiUrl}?${params.toString()}`);
      const data = response.data;

      if (data && Array.isArray(data)) {
        setResults((prevResults) => {
          const existingIds = new Set(prevResults.map(post => post.post_id));
          const newPosts = data.filter((post: Post) => !existingIds.has(post.post_id));
          if (newPosts.length === 0) {
            setHasMore(false);
            return prevResults;
          }
          return [...prevResults, ...newPosts];
        });

        if (data.length === 10) {
          const lastPost = data[data.length - 1];
          setOffset(lastPost.post_id);
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset, searchText, searchType]);

  useEffect(() => {
    if (loading || !hasMore || !loadMoreRef.current) return;

    const options = {
      root: null,
      rootMargin: '50px', // マージンを小さくして制御を改善
      threshold: 0.1,    // しきい値を調整
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    };

    const currentObserver = new IntersectionObserver(callback, options);
    currentObserver.observe(loadMoreRef.current);
    observer.current = currentObserver;

    return () => {
      if (currentObserver) currentObserver.disconnect();
    };
  }, [loading, hasMore, loadMore]);

  const handleDelete = async (event: React.MouseEvent<Element, MouseEvent>, post_id: string): Promise<boolean> => {
    event.stopPropagation();  // イベントの伝播を停止
    if (!window.confirm('本当に削除しますか？')) return false;

    try {
      const response = await axios.delete('/api/post/post_delete', {
        data: { post_id },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        setResults((prevResults) => prevResults.filter(post => post.post_id !== post_id));
        alert('投稿が削除されました。');
        return true;
      } else {
        alert('削除に失敗しました。');
        return false;
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('エラーが発生しました。');
      return false;
    }
  };

  const handleSearch = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    event.preventDefault();
    
    // 検索条件の検証を修正
    if (searchText.trim() === '' && !sinceDate && !untilDate) {
      alert('検索文字を入力するか、日時を指定してください。');
      return;
    }

    // クエリパラメータの更新
    const queryParams = new URLSearchParams();
    if (searchText.trim() !== '') {
      queryParams.set('searchText', searchText);
      queryParams.set('searchType', searchType);
    }
    if (sinceDate) queryParams.set('since', convertDateToPostId(sinceDate, true));
    if (untilDate) queryParams.set('until', convertDateToPostId(untilDate, false));

    // URLを更新
    const queryString = queryParams.toString();
    router.push(queryString ? `/search?${queryString}` : '/search');
    
    // 検索を実行
    performSearch(searchText, searchType, true, 1);
    
    // モバイル用モーダルを閉じる
    setIsModalOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    performSearch(searchText, searchType, true, newPage);
  };

  // URLパラメータの変更を監視して検索を実行
  useEffect(() => {
    let isInitialMount = true;

    if (urlSearchText && isInitialMount) {
      setSearchText(urlSearchText);
      setSearchType(urlSearchType);
      performSearch(urlSearchText, urlSearchType, true);
    }

    return () => {
      isInitialMount = false;
    };
  }, [urlSearchText, urlSearchType]); // performSearch を依存配列から削除

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isModalOpen]);
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* メインコンテンツ */}
      <main className="flex-1 min-h-screen md:pl-64">
        <div className="h-screen max-w-4xl mx-auto px-4 py-4 md:pr-[320px] overflow-y-auto scrollbar-hide">
          {loading && results.length === 0 && (
            <div className="text-center text-gray-500">検索中...</div>
          )}

          {error && (
            <div className="text-center text-red-500">エラー: {error}</div>
          )}

          <div className="flex flex-col space-y-4">
            {results.map((post) => (
              <PostCard
                key={post.post_id}
                post={post}
                isLoggedIn={isLoggedIn}
                onDelete={handleDelete}
                handleDeleteClick={handleDelete}
                formatDate={(date: string) => formatDate(new Date(date))}
              />
            ))}
          </div>

          {loading && (
            <div className="text-center text-gray-500 my-4">読み込み中...</div>
          )}

          {hasMore && <div ref={loadMoreRef} className="h-1" />}

          {(!loading && results.length === 0 && !error) && (
            <div className="text-center text-gray-500 mt-4">結果が見つかりませんでした。</div>
          )}

          {/* ページネーションUI */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4 mb-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50"
              >
                前へ
              </button>
              <span className="text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          )}
        </div>
      </main>

      {/* デスクトップ用検索フォーム */}
      <aside className="hidden md:block fixed right-0 top-0 w-[300px] h-full bg-white dark:bg-gray-900 border-l dark:border-gray-800 z-20">
        <div className="p-4 h-full">
          <h2 className="text-xl font-bold mb-4 dark:text-white">検索</h2>
          <div className="flex flex-col space-y-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="検索キーワードを入力"
              className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full border border-gray-300 dark:bg-gray-800 px-4 py-2 rounded-md"
            >
              <option value="full_text">全文検索</option>
              <option value="hashtag">タグ検索</option>
            </select>
            <input
              type="date"
              value={sinceDate}
              onChange={(e) => setSinceDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              検索
            </button>
          </div>
        </div>
      </aside>

      {/* モバイル用検索ボタン */}
      <button
        className="md:hidden fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-30"
        onClick={() => setIsModalOpen(true)}
      >
        🔍
      </button>

      {/* モーダル内検索フォーム */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-11/12 max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">検索</h2>
            <div className="flex flex-col space-y-4">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="検索キーワードを入力"
                className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full border border-gray-300 dark:bg-gray-800 px-4 py-2 rounded-md"
              >
                <option value="full_text">全文検索</option>
                <option value="hashtag">タグ検索</option>
              </select>
              {/* 追加: 日時入力 */}
              <input
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                検索
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
