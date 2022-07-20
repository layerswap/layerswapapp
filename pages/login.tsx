import Layout from '../components/layout'
import { AuthProvider } from '../context/auth'
import IntroCard from '../components/introCard'
import Wizard from '../components/Wizard/Wizard'
import { FormWizardProvider } from '../context/formWizardProvider'
import { LoginWizardSteps } from '../Models/Wizard'
import EmailStep from '../components/Wizard/Steps/Login/EmailStep'
import CodeStep from '../components/Wizard/Steps/Login/CodeStep'
import { MenuProvider } from '../context/menu'

const loginWizard: LoginWizardSteps = {
  "Email": { title: "Email confirmation", content: EmailStep, navigationDisabled: true, positionPercent: 50 },
  "Code": { title: "Code", content: CodeStep, positionPercent: 75 },
}

export default function Transactions() {

  return (
    <Layout>
      <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
        <div className="flex flex-col w-full space-y-6 text-white animate-fade-in">
          <AuthProvider>
            <MenuProvider>
              <FormWizardProvider wizard={loginWizard} initialStep={"Email"} initialLoading={true}>
                <Wizard />
              </FormWizardProvider >
            </MenuProvider>
          </AuthProvider>
        </div>
      </div>
    </Layout>
  )
}
