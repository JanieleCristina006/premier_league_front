import HeroBannerCanal from '../components/Header'
import TabelaBolao from '../components/TabelaBolao'
import TabelaJogos from '../components/TabelaDeJogos'
import { TabelaRodada } from '../components/TabelaRodada'


export default function Home() {
  return (
    <>
      <HeroBannerCanal />

      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <TabelaJogos />
          <TabelaRodada />
        </div>

      </div>

       <TabelaBolao />
       
    </>
  )
}