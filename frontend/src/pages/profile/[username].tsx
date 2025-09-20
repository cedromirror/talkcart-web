import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import ProfilePage from '@/components/profile/ProfilePage';

const UserProfilePage: NextPage = () => {
  const router = useRouter();
  const { username } = router.query;

  if (!username || typeof username !== 'string') {
    return (
      <Layout>
        <Head>
          <title>Profile | TalkCart</title>
        </Head>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>@{username} | TalkCart</title>
        <meta name="description" content={`View ${username}'s profile on TalkCart`} />
      </Head>

      <ProfilePage username={username} />
    </Layout>
  );
};

export default UserProfilePage;