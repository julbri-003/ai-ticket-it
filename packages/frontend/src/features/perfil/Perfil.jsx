import { useRef, useState } from "react";
import styled from "styled-components/native";
import { LogOut } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { Pantalla } from "../../components/layout/Pantalla";
import { SelectorTema } from "../../components/layout/Footer";
import {
  Badge,
  Button,
  EtiquetaSeccion,
  ModalConfirmacion,
  Rating,
  TextoTalon,
  TicketCard,
  TituloEscena,
} from "../../components/ui";

const ETIQUETA_ROL = { COMPRADOR: "Comprador/a", ORGANIZADOR: "Organizador/a" };

/** Datos de la cuenta, rol, tema y cerrar sesión (con confirmación). */
export function Perfil() {
  const { usuario, cerrarSesion, esOrganizador } = useAuth();
  const [confirmando, setConfirmando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const disparador = useRef(null);

  if (!usuario) return null;

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesion();
  };

  return (
    <Pantalla>
      <TicketCard
        talon={
          <FilaTalon>
            <TextoTalon>Pase de socio</TextoTalon>
            <TextoTalon>{ETIQUETA_ROL[usuario.rol]}</TextoTalon>
          </FilaTalon>
        }
      >
        <EtiquetaSeccion>Tu cuenta</EtiquetaSeccion>
        <TituloEscena texto={`Hola, ${usuario.nombre}`} destacada={usuario.nombre} />
        <Dato>{usuario.nombreCompleto}</Dato>
        <DatoSuave>{usuario.email}</DatoSuave>
        <Badge variant="primary">{ETIQUETA_ROL[usuario.rol]}</Badge>
        {esOrganizador ? (
          <Puntaje>
            <DatoSuave>Tu puntaje como organizador/a</DatoSuave>
            <Rating valor={usuario.puntajePromedio ?? 0} cantidad={usuario.cantidadResenias ?? 0} />
          </Puntaje>
        ) : null}
      </TicketCard>

      <Seccion>
        <EtiquetaSeccion>Apariencia</EtiquetaSeccion>
        <SelectorTema />
      </Seccion>

      <BotonSalir ref={disparador}>
        <Button variant="outline" icono={LogOut} onPress={() => setConfirmando(true)} bloque>
          Cerrar sesión
        </Button>
      </BotonSalir>

      <ModalConfirmacion
        visible={confirmando}
        titulo="¿Cerrar sesión?"
        mensaje="Vas a tener que volver a ingresar con tu email y contraseña."
        textoConfirmar="Cerrar sesión"
        peligro
        cargando={saliendo}
        alConfirmar={salir}
        alCancelar={() => setConfirmando(false)}
        refDisparador={disparador}
      />
    </Pantalla>
  );
}

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const Dato = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DatoSuave = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Puntaje = styled.View`
  gap: 6px;
  margin-top: 8px;
`;

const Seccion = styled.View`
  gap: 12px;
`;

const BotonSalir = styled.View``;

export default Perfil;
