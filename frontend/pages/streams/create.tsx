import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/explore',
      permanent: false,
    },
  };
};

export default function StreamsCreateRemoved() {
  return null;
}
