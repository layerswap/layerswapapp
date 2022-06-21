import Layout from '../components/layout'
import { AuthProvider } from '../context/auth'
import IntroCard from '../components/introCard'
import TransactionsHistory from '../components/swapHistoryComponent'
import { MenuProvider } from '../context/menu'

export default function Transactions() {

  return (
    <Layout>
      <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8">
        <div className="flex flex-col space-y-6 text-white">
          <AuthProvider>
            <MenuProvider>
              <TransactionsHistory />
            </MenuProvider>
          </AuthProvider>
          <IntroCard />
        </div>
      </div>
    </Layout>
  )
}
