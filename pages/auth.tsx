import Layout from '../components/layout'
import { AuthProvider } from '../context/authContext'
import IntroCard from '../components/introCard'
import { MenuProvider } from '../context/menu'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'

export default function AuthPage() {

  return (
    <Layout>
      <AuthProvider>
        <MenuProvider>
          <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
            <AuthWizard />
          </FormWizardProvider >
        </MenuProvider>
      </AuthProvider>
    </Layout>
  )
}
