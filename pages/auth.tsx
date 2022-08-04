import Layout from '../components/layout'
import { AuthProvider } from '../context/authContext'
import IntroCard from '../components/introCard'
import Wizard from '../components/Wizard/Wizard'
import { FormWizardProvider } from '../context/formWizardProvider'
import { LoginWizardSteps } from '../Models/Wizard'
import EmailStep from '../components/Wizard/Steps/Login/EmailStep'
import { MenuProvider } from '../context/menu'
import LoginCodeStep from '../components/Wizard/Steps/Login/LoginCodeStep'

const loginWizard: LoginWizardSteps = {
  "Email": { title: "Email confirmation", content: EmailStep, navigationDisabled: true, positionPercent: 50 },
  "Code": { title: "Code", content: LoginCodeStep, positionPercent: 75 },
}

export default function AuthPage() {

  return (
    <Layout>
      <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
        <div className="flex flex-col space-y-6 text-white animate-fade-in">
          <AuthProvider>
            <MenuProvider>
              <FormWizardProvider wizard={loginWizard} initialStep={"Email"} initialLoading={true}>
                <Wizard />
              </FormWizardProvider >
            </MenuProvider>
          </AuthProvider>
          <IntroCard />
        </div>
      </div>
    </Layout>
  )
}
